/**
 * Email-based trip/event parser.
 *
 * Accepts a raw email payload (subject, body text, optional HTML body) and
 * extracts structured trip event data that can be matched against existing
 * trips or used to create new ones.
 */

export type ReservationType =
  | 'flight'
  | 'hotel'
  | 'car'
  | 'rail'
  | 'activity'
  | 'restaurant'
  | 'cruise'
  | 'transport'
  | 'other';

export interface ParsedEmailEvent {
  type: ReservationType;
  title: string;
  confirmationNumber: string | null;
  providerName: string | null;
  startDateTime: Date | null;
  endDateTime: Date | null;
  /** Primary location string (city, airport code, address, etc.) */
  location: string | null;
  /** Destination city/location, used for trip matching */
  destinationCity: string | null;
  /** IATA departure airport code, flights only */
  departureAirport: string | null;
  /** IATA arrival airport code, flights only */
  arrivalAirport: string | null;
  /** Airline code, flights only */
  airlineCode: string | null;
  /** Flight number, flights only */
  flightNumber: string | null;
  notes: string | null;
}

export interface EmailParseResult {
  events: ParsedEmailEvent[];
  rawSubject: string;
  /** Best-guess overall trip location derived from events */
  tripLocation: string | null;
  /** Earliest date across all events */
  tripStartDate: Date | null;
  /** Latest date across all events */
  tripEndDate: Date | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, janvier: 0, enero: 0, gennaio: 0, januar: 0, janeiro: 0,
  feb: 1, february: 1, février: 1, fevrier: 1, febrero: 1, febbraio: 1, februar: 1, fevereiro: 1,
  mar: 2, march: 2, mars: 2, marzo: 2, märz: 2, marz: 2, março: 2, marco: 2,
  apr: 3, april: 3, avril: 3, abril: 3, aprile: 3,
  may: 4, mai: 4, mayo: 4, maggio: 4, maio: 4,
  jun: 5, june: 5, juin: 5, junio: 5, giugno: 5, juni: 5, junho: 5,
  jul: 6, july: 6, juillet: 6, julio: 6, luglio: 6, juli: 6, julho: 6,
  aug: 7, august: 7, août: 7, aout: 7, agosto: 7,
  sep: 8, sept: 8, september: 8, septembre: 8, septiembre: 8, settembre: 8, setembro: 8,
  oct: 9, october: 9, octobre: 9, octubre: 9, ottobre: 9, oktober: 9, outubro: 9,
  nov: 10, november: 10, novembre: 10, noviembre: 10, novembro: 10,
  dec: 11, december: 11, décembre: 11, decembre: 11, diciembre: 11, dicembre: 11, dezember: 11, dezembro: 11,
};

/** Parse a date string in a variety of common confirmation-email formats. */
function parseEmailDate(raw: string): Date | null {
  if (!raw) return null;

  // ISO-8601 or similar: 2025-06-15T10:30:00
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      iso[4] ? Number(iso[4]) : 0,
      iso[5] ? Number(iso[5]) : 0
    );
  }

  // "June 15, 2025" or "Jun 15 2025" or "15 June 2025"
  const alpha = raw.match(
    /(\d{1,2})\.?\s+(?:de\s+)?([\p{L}.]+)\s+(?:de\s+)?(\d{4})(?:\s+(?:(?:at|à|alle|a\s+las|um|às)\s+)?(\d{1,2})[:h.](\d{2})(?:\s*([AP]M))?)?/iu
  );
  if (alpha) {
    const month = MONTHS[alpha[2].replace('.', '').toLowerCase()];
    if (month !== undefined) {
      let hour = alpha[4] ? Number(alpha[4]) : 0;
      if (alpha[6]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (alpha[6]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return new Date(Number(alpha[3]), month, Number(alpha[1]), hour, alpha[5] ? Number(alpha[5]) : 0);
    }
  }

  // "June 15, 2025 10:30 AM"
  const alpha2 = raw.match(
    /([\p{L}.]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(?:(?:at|à|alle|a\s+las|um|às)\s+)?(\d{1,2})[:h.](\d{2})(?:\s*([AP]M))?)?/iu
  );
  if (alpha2) {
    const month = MONTHS[alpha2[1].replace('.', '').toLowerCase()];
    if (month !== undefined) {
      let hour = alpha2[4] ? Number(alpha2[4]) : 0;
      if (alpha2[6]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (alpha2[6]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return new Date(Number(alpha2[3]), month, Number(alpha2[2]), hour, alpha2[5] ? Number(alpha2[5]) : 0);
    }
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdy) {
    const first = Number(mdy[1]);
    const second = Number(mdy[2]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    return new Date(Number(mdy[3]), month - 1, day);
  }

  // DD.MM.YYYY (European format) with optional time: 16.09.2026, 18:00
  const dmy = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*[,:]?\s*(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    return new Date(
      Number(dmy[3]),
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      dmy[4] ? Number(dmy[4]) : 0,
      dmy[5] ? Number(dmy[5]) : 0
    );
  }

  return null;
}

/** Normalize the plain-text body: strip HTML tags if present and collapse whitespace. */
function normalizeBody(body: string): string {
  return body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&pound;/g, '£')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&bull;/g, '•')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#\d+;/g, (m) => String.fromCharCode(Number(m.slice(2, -1))))
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Type detection ───────────────────────────────────────────────────────────

function detectType(subject: string, body: string): ReservationType {
  const content = `${subject} ${body}`.toLowerCase();

  if (
    /\b(flight|airline|boarding pass|e-ticket|air ticket|vuelo|vol|volo|flug|voo)\b|itinerary.*flight/.test(content) ||
    /\b[A-Z]{2,3}\s*\d{3,4}\b/.test(subject)
  ) return 'flight';

  if (/\b(hotel|hôtel|albergo|accommodation|lodging|alojamiento|hospedagem|unterkunft)\b|check.?in|check.?out|reservation.*room|room.*reservation/.test(content))
    return 'hotel';

  if (/\b(car rental|rent.?a.?car|vehicle rental|alquiler de coche|alquiler de auto|location de voiture|noleggio auto|autovermietung)\b|pickup.*rental|rental.*pickup/.test(content))
    return 'car';

  if (/\b(train|rail|amtrak|eurostar|tren|treno|zug|comboio)\b/.test(content))
    return 'rail';

  if (/\b(cruise|crucero|croisière|croisiere|crociera|kreuzfahrt|cruzeiro)\b/.test(content))
    return 'cruise';

  if (/\b(restaurant|restaurante|ristorante|dining|opentable)\b|open table|reservation.*table|table.*reservation|table\s+for\s+\d|mesa\s+para|tavolo\s+per|table\s+pour/.test(content))
    return 'restaurant';

  if (/\b(activity|actividad|activité|activite|attività|attivita|aktivität|aktivitat|tour|excursion|escursione|ausflug)\b|ticket.*event|event.*ticket/.test(content))
    return 'activity';

  if (/\b(transfer|transport|transportation|shuttle|traslado|navetta|navette|transporte)\b/.test(content))
    return 'transport';

  return 'other';
}

// ─── Field extractors ─────────────────────────────────────────────────────────

function extractConfirmationNumber(body: string, subject: string): string | null {
  const numberLabel = '(?:number|número|numero|numéro|nummer|nº|n°|#|no\\.?|code|código|codigo|codice|référence|referencia)';
  const reservationLabel = '(?:booking|reservation|réservation|reservación|reservacion|prenotazione|reservierung|reserva)';
  const patterns = [
    /(?:buchungsnummer|bestätigungsnummer|bestatigungsnummer|codice prenotazione)\s*[:#-]?\s*([A-Z0-9-]{4,20})/i,
    new RegExp(`${numberLabel}\\s+(?:de\\s+)?${reservationLabel}\\s*[:#-]?\\s*([A-Z0-9-]{4,20})`, 'i'),
    /(?:code|código|codigo|codice)\s*[:#-]\s*([A-Z0-9-]{4,20})/i,
    new RegExp(`(?:confirmation|confirmación|confirmacion|conferma|bestätigung|bestatigung|confirmação|confirmacao|record locator|pnr)\\s*${numberLabel}\\s*[:#-]?\\s*([A-Z0-9-]{4,20})`, 'i'),
    new RegExp(`(?:booking|reservation|réservation|reservación|reservacion|prenotazione|reservierung|reserva)\\s*${numberLabel}\\s*[:#-]?\\s*([A-Z0-9-]{4,20})`, 'i'),
    new RegExp(`(?:ticket|billet|boleto|biglietto)\\s*${numberLabel}?\\s*[:#-]?\\s*([A-Z0-9-]{4,20})`, 'i'),
    new RegExp(`(?:order|reference|référence|referencia|riferimento)\\s*${numberLabel}\\s*[:#-]?\\s*([A-Z0-9-]{4,20})`, 'i'),
  ];
  for (const p of patterns) {
    const m = (subject + ' ' + body).match(p);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function extractProviderName(subject: string, body: string, type: ReservationType): string | null {
  // Flight: airline from "Confirmation from United Airlines" or known patterns
  if (type === 'flight') {
    const m = subject.match(/(?:from|by|via|with)\s+([A-Z][A-Za-z ]{2,30}(?:Airlines?|Airways?|Air Lines?))/i)
      || body.match(/(?:airline|carrier)[:\s]+([A-Z][A-Za-z ]{2,30})/i);
    if (m) return m[1].trim();
  }

  if (type === 'hotel') {
    const m = subject.match(/(?:at|from|by)\s+([A-Z][A-Za-z &']{3,40}(?:Hotel|Inn|Resort|Suites?|Marriott|Hilton|Hyatt|Sheraton|Westin))/i)
      || body.match(/(?:hotel|property)[:\s]+([A-Z][A-Za-z &']{3,40})/i);
    if (m) return m[1].trim();
  }

  if (type === 'car') {
    const m = body.match(/(?:rental company|vendor)[:\s]+([A-Z][A-Za-z ]{2,30})/i)
      || subject.match(/(?:from|by)\s+([A-Z][A-Za-z ]{2,20}(?:Car Rental|Rent A Car)?)/i);
    if (m) return m[1].trim();
  }

  return null;
}

function extractFlightDetails(body: string, subject: string): {
  airlineCode: string | null;
  flightNumber: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
} {
  let airlineCode: string | null = null;
  let flightNumber: string | null = null;
  let departureAirport: string | null = null;
  let arrivalAirport: string | null = null;

  // Flight number from subject or body: "AA123", "AA 123", "UA 456"
  const fnMatch = (subject + ' ' + body).match(/\b([A-Z]{2,3})\s*(\d{2,4})\b/);
  if (fnMatch) {
    airlineCode = fnMatch[1].toUpperCase();
    flightNumber = fnMatch[2];
  }

  // Route: "JFK to LHR" or "JFK → LHR" or "From JFK To LHR"
  const routeMatch = (subject + ' ' + body).match(
    /\b([A-Z]{3})\s*(?:to|→|–|-)\s*([A-Z]{3})\b/
  );
  if (routeMatch) {
    departureAirport = routeMatch[1];
    arrivalAirport = routeMatch[2];
  }

  return { airlineCode, flightNumber, departureAirport, arrivalAirport };
}

function extractDates(body: string, type: ReservationType): {
  startDateTime: Date | null;
  endDateTime: Date | null;
} {
  let startDateTime: Date | null = null;
  let endDateTime: Date | null = null;
  const normalizedBody = body.toLowerCase();
  const lastSubject = Math.max(
    normalizedBody.lastIndexOf('subject:'),
    normalizedBody.lastIndexOf('asunto:'),
    normalizedBody.lastIndexOf('objet:'),
    normalizedBody.lastIndexOf('oggetto:'),
    normalizedBody.lastIndexOf('betreff:'),
  );
  const reservationContent = lastSubject >= 0 ? body.slice(lastSubject) : body;

  const labeledPatterns: [RegExp, 'start' | 'end'][] = [];

  if (type === 'flight') {
    labeledPatterns.push(
      [/(?:depart(?:ure)?|departure date|departs?)[:\s]+([^\n]{5,30})/i, 'start'],
      [/(?:arriv(?:al|e)|arrival date|arrives?)[:\s]+([^\n]{5,30})/i, 'end'],
    );
  } else if (type === 'hotel') {
    labeledPatterns.push(
      [/(?:check.?in|arrival)[:\s]+([^\n]{5,30})/i, 'start'],
      [/(?:check.?out|departure)[:\s]+([^\n]{5,30})/i, 'end'],
    );
  } else if (type === 'car') {
    labeledPatterns.push(
      [/(?:pick.?up|pickup)[:\s]+([^\n]{5,30})/i, 'start'],
      [/(?:drop.?off|return)[:\s]+([^\n]{5,30})/i, 'end'],
      // "Dates: from 16.09.2026, 18:00 to 24.09.2026, 20:00"
      [/(?:dates?)[:\s]+from\s+(.+?)\s+to\s+([^\n]{5,40})/i, 'start'],
      [/(?:dates?)[:\s]+from\s+.+?\s+to\s+([^\n]{5,40})/i, 'end'],
    );
  } else {
    labeledPatterns.push(
      [/(?:date|fecha|data|datum|jour|starts?|begins?|inicio|début|debut|inizio|beginn)[:\s]+([^\n]{5,50})/i, 'start'],
      [/(?:ends?|through|until|fin|final|hasta|jusqu(?:'|’)à|fine|ende|término|termino)[:\s]+([^\n]{5,50})/i, 'end'],
      [/(?:on|el|le|il|am|em|para|pour|per)\s+(?:[\p{L}]+,?\s+)?([\p{L}.]+\s+\d{1,2},?\s+\d{4}(?:\s+(?:at|à|alle|a\s+las|um|às)\s+\d{1,2}[:h.]\d{2}\s*(?:[AP]M)?)?)/iu, 'start'],
      [/(?:on|el|le|il|am|em|para|pour|per)\s+(?:[\p{L}]+,?\s+)?(\d{1,2}\.?\s+(?:de\s+)?[\p{L}.]+\s+(?:de\s+)?\d{4}(?:\s+(?:at|à|alle|a\s+las|um|às)\s+\d{1,2}[:h.]\d{2}\s*(?:[AP]M)?)?)/iu, 'start'],
    );
  }

  for (const [re, role] of labeledPatterns) {
    const m = reservationContent.match(re);
    if (!m) continue;
    const d = parseEmailDate(m[1].trim());
    if (!d) continue;
    if (role === 'start' && !startDateTime) startDateTime = d;
    if (role === 'end' && !endDateTime) endDateTime = d;
  }

  // Fallback: grab first date-like string in the reservation content as start
  if (!startDateTime) {
    const genericDate = reservationContent.match(/(\d{1,2}\.?\s+(?:de\s+)?[\p{L}.]{3,12}\s+(?:de\s+)?\d{4}|[\p{L}.]{3,12}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/u);
    if (genericDate) startDateTime = parseEmailDate(genericDate[1]);
  }

  // Fallback for end: grab second date-like string
  if (!endDateTime) {
    const allDates = reservationContent.matchAll(/(\d{1,2}\.\d{1,2}\.\d{4})/g);
    const matches = [...allDates].map(m => parseEmailDate(m[1])).filter(Boolean) as Date[];
    if (matches.length >= 2) endDateTime = matches[1];
  }

  return { startDateTime, endDateTime };
}

function extractLocation(body: string, type: ReservationType): string | null {
  if (type === 'hotel') {
    const m = body.match(/(?:address|location|hotel)[:\s]+([^\n]{5,80})/i)
      || body.match(/(?:city)[:\s]+([A-Za-z ,]{3,40})/i);
    if (m) return m[1].trim();
  }

  if (type === 'flight') {
    // Use arrival city name if present
    const m = body.match(/(?:arrive|arriving)[^\n]*?([A-Za-z]{3,30}(?:,\s*[A-Z]{2,3})?)\s*\(/i)
      || body.match(/(?:destination)[:\s]+([A-Za-z ,]{3,40})/i);
    if (m) return m[1].trim();
  }

  if (type === 'car') {
    // Use pick-up location
    const m = body.match(/(?:pick.?up|pickup)[:\s]+([^\n]{5,80})/i)
      || body.match(/(?:pick.?up location)[:\s]+([^\n]{5,80})/i);
    if (m) return m[1].trim();
  }

  const labeled = body.match(/(?:location|venue|address|place|ubicación|ubicacion|dirección|direccion|lieu|adresse|luogo|indirizzo|ort|adresse|localização|localizacao|endereço|endereco)[:\s]+([^\n]{5,120})/i);
  if (labeled) return labeled[1].trim();

  const postalAddress = body.match(/([A-ZÀ-Ý][\p{L}'’.-]+(?:\s+[A-ZÀ-Ý][\p{L}'’.-]+)*),\s+(?:Provincia di\s+[^\n,]+|[A-Z]{2,3}|[\p{L}'’.-]+(?:\s+[\p{L}'’.-]+)*)\s+\d{4,6}/u);
  if (postalAddress) return postalAddress[0].trim();
  return null;
}

function extractDestinationCity(body: string, type: ReservationType, location: string | null): string | null {
  if (type === 'hotel' && location) {
    // "Paris, France" → "Paris"
    return location.split(',')[0].trim();
  }

  if (type === 'flight') {
    const m = body.match(/(?:arrive|arrival|destination)[^\n]*?city[:\s]+([A-Za-z ]{3,40})/i)
      || body.match(/to\s+([A-Z][a-zA-Z ]{2,30})(?:\s*\([A-Z]{3}\))/);
    if (m) return m[1].trim();
  }

  if (type === 'car' && location) {
    // Extract city from pick-up location like "1 - OLB - Olbia Airport, Car rental terminal"
    // Try to get the city name after the IATA code
    const iataMatch = location.match(/-\s*[A-Z]{3}\s*-\s*([A-Za-z ]+?)(?:\s+Airport|\s+Station|\s+Terminal|,|$)/);
    if (iataMatch) return iataMatch[1].trim();
    // Fallback: first part before comma
    return location.split(',')[0].trim();
  }

  if (location && ['restaurant', 'activity', 'transport', 'other'].includes(type)) {
    const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1 && /^(?:\d|via\b|rue\b|calle\b|avenida\b|av\.?\b|straße\b|strasse\b|road\b|street\b|st\.?\b|piazza\b|plaza\b|place\b|square\b)/i.test(parts[0])) {
      return parts.at(-1)?.replace(/^\d{4,6}\s+/, '').trim() || parts[0];
    }
  }

  // Generic: look for "destination:" label specifically (not "city" which matches billing addresses)
  const m = body.match(/(?:destination)[:\s]+([A-Za-z ,]{3,40})/i);
  if (m) return m[1].split(',')[0].trim();

  return location ? location.split(',')[0].trim() : null;
}

function extractCarDetails(body: string, location: string | null): string | null {
  const pickUp = body.match(/pick.?up location[:\s]+(.+?)(?=\s+(?:drop.?off|vehicle|additional|location fee|night fee|payment|notes|total|$))/i)?.[1]?.trim();
  const dropOff = body.match(/drop.?off location[:\s]+(.+?)(?=\s+(?:vehicle|additional|location fee|night fee|payment|notes|total|$))/i)?.[1]?.trim();
  const vehicle = body.match(/vehicle[:\s]+(.+?)(?=\s+(?:additional|location fee|night fee|payment|notes|total|$))/i)?.[1]?.trim();
  const total = body.match(/total paid[:\s]+(.+?)(?=\s+(?:your booking|notes|$))/i)?.[1]?.trim();

  const parts: string[] = [];
  if (pickUp) parts.push(`Pick-up: ${pickUp}`);
  if (dropOff) parts.push(`Drop-off: ${dropOff}`);
  if (vehicle) parts.push(`Vehicle: ${vehicle}`);
  if (total) parts.push(`Total paid: ${total}`);

  return parts.length ? parts.join('\n') : null;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a single confirmation email into one or more structured trip events.
 * For most emails this produces a single event; multi-leg itineraries with
 * multiple flights in one email can produce multiple events.
 */
export function parseConfirmationEmail(opts: {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}): EmailParseResult {
  const { subject } = opts;
  const body = normalizeBody(opts.bodyHtml ?? opts.bodyText);

  console.log('[email-parser] Parsing email:', { subject, bodyLength: body.length });

  const type = detectType(subject, body);
  console.log('[email-parser] Detected type:', type);

  const confirmationNumber = extractConfirmationNumber(body, subject);
  console.log('[email-parser] Confirmation number:', confirmationNumber);

  const providerName = extractProviderName(subject, body, type);
  console.log('[email-parser] Provider name:', providerName);

  const { startDateTime, endDateTime } = extractDates(body, type);
  console.log('[email-parser] Dates:', { startDateTime, endDateTime });

  const location = extractLocation(body, type);
  console.log('[email-parser] Location:', location);

  const destinationCity = extractDestinationCity(body, type, location);
  console.log('[email-parser] Destination city:', destinationCity);

  let airlineCode: string | null = null;
  let flightNumber: string | null = null;
  let departureAirport: string | null = null;
  let arrivalAirport: string | null = null;
  let title = subject.replace(/^(fwd?:|re:)\s*/i, '').trim();

  if (type === 'flight') {
    const fd = extractFlightDetails(body, subject);
    airlineCode = fd.airlineCode;
    flightNumber = fd.flightNumber;
    departureAirport = fd.departureAirport;
    arrivalAirport = fd.arrivalAirport;
    if (departureAirport && arrivalAirport) {
      title = `${departureAirport} → ${arrivalAirport}`;
    }
  }

  if (type === 'car' && destinationCity) {
    title = `${destinationCity} car rental` + (confirmationNumber ? ` (${confirmationNumber})` : '');
  }

  const notes = type === 'car' ? extractCarDetails(body, location) : null;
  console.log('[email-parser] Notes:', notes);

  const event: ParsedEmailEvent = {
    type,
    title,
    confirmationNumber,
    providerName,
    startDateTime,
    endDateTime,
    location,
    destinationCity,
    departureAirport,
    arrivalAirport,
    airlineCode,
    flightNumber,
    notes,
  };

  const dates = [startDateTime, endDateTime].filter(Boolean) as Date[];
  const tripStartDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
  const tripEndDate = dates.length > 1 ? new Date(Math.max(...dates.map(d => d.getTime()))) : tripStartDate;

  return {
    events: [event],
    rawSubject: subject,
    tripLocation: destinationCity ?? location,
    tripStartDate,
    tripEndDate,
  };
}
