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
  destinationCountry: string | null;
  address: string | null;
  /** IATA departure airport code, flights only */
  departureAirport: string | null;
  /** IATA arrival airport code, flights only */
  arrivalAirport: string | null;
  /** Airline code, flights only */
  airlineCode: string | null;
  /** Flight number, flights only */
  flightNumber: string | null;
  notes: string | null;
  /** Whether the start time was explicitly found (vs. defaulting to midnight) */
  hasTime: boolean;
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

/**
 * Deserialize a JSON string of ParsedEmailEvent[] (as produced by
 * JSON.stringify) back into events with real Date objects.
 * JSON.stringify converts Date to ISO strings; JSON.parse leaves them as
 * strings, which breaks downstream code that calls .getTime() etc.
 */
export function deserializeEvents(json: string): ParsedEmailEvent[] {
  const events = JSON.parse(json) as ParsedEmailEvent[];
  for (const e of events) {
    if (typeof e.startDateTime === 'string') e.startDateTime = new Date(e.startDateTime);
    if (typeof e.endDateTime === 'string') e.endDateTime = new Date(e.endDateTime);
    // Backward compat: old events may not have hasTime
    if (e.hasTime === undefined) e.hasTime = true;
  }
  return events;
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

/** Parse a date string in a variety of common confirmation-email formats.
 *
 *  Returns a Date constructed via `Date.UTC(...)` so that the wall-clock
 *  components (year, month, day, hour, minute) found in the email are
 *  preserved exactly regardless of the server's local timezone.  Email
 *  confirmation times are "local to the event" and carry no timezone
 *  information, so we store them as naive datetimes encoded in UTC.  The
 *  display layer must use `dayjs.utc(...)` to render them without
 *  timezone conversion.
 */
function parseEmailDate(raw: string): Date | null {
  if (!raw) return null;

  // ISO-8601 or similar: 2025-06-15T10:30:00
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (iso) {
    return new Date(
      Date.UTC(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3]),
        iso[4] ? Number(iso[4]) : 0,
        iso[5] ? Number(iso[5]) : 0
      )
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
      return new Date(Date.UTC(Number(alpha[3]), month, Number(alpha[1]), hour, alpha[5] ? Number(alpha[5]) : 0));
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
      return new Date(Date.UTC(Number(alpha2[3]), month, Number(alpha2[2]), hour, alpha2[5] ? Number(alpha2[5]) : 0));
    }
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdy) {
    const first = Number(mdy[1]);
    const second = Number(mdy[2]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    return new Date(Date.UTC(Number(mdy[3]), month - 1, day));
  }

  // DD.MM.YYYY (European format) with optional time: 16.09.2026, 18:00
  const dmy = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*[,:]?\s*(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    return new Date(
      Date.UTC(
        Number(dmy[3]),
        Number(dmy[2]) - 1,
        Number(dmy[1]),
        dmy[4] ? Number(dmy[4]) : 0,
        dmy[5] ? Number(dmy[5]) : 0
      )
    );
  }

  return null;
}

/** Normalize the plain-text body: strip HTML tags if present and collapse whitespace. */
function normalizeBody(body: string): string {
  return body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|td|h[1-6]|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
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

  // Restaurant — check before hotel so "reservation ... in the room" doesn't
  // falsely trigger hotel detection.
  if (
    /\b(restaurant|restaurante|ristorante|dining|opentable)\b|open table|reservation.*table|table.*reservation|table\s+for\s+\d|mesa\s+para|tavolo\s+per|table\s+pour/.test(content) ||
    /\bbooking\b.*\b(people|guest|person|party)\b/.test(content) ||
    /\b(booking\s+confirmation|booking\s+request)\b.*\b\d+\s*(people|person|guest)\b/.test(content)
  )
    return 'restaurant';

  if (/\b(hotel|hôtel|albergo|accommodation|lodging|alojamiento|hospedagem|unterkunft)\b|check.?in|check.?out|room\s+(?:reservation|booking)|reservation.*room\s+(?:reservation|booking)/.test(content))
    return 'hotel';

  if (/\b(car rental|rent.?a.?car|vehicle rental|alquiler de coche|alquiler de auto|location de voiture|noleggio auto|autovermietung)\b|pickup.*rental|rental.*pickup/.test(content))
    return 'car';

  if (/\b(train|rail|amtrak|eurostar|tren|treno|zug|comboio)\b/.test(content))
    return 'rail';

  if (/\b(cruise|crucero|croisière|croisiere|crociera|kreuzfahrt|cruzeiro)\b/.test(content))
    return 'cruise';

  if (
    /\b(activity|actividad|activité|activite|attività|attivita|aktivität|aktivitat|tour|excursion|escursione|ausflug)\b|ticket.*event|event.*ticket/.test(content) ||
    /\b(spiaggia|beach|ombrellone|lettino|prenotazione\s+spiaggia)\b/.test(content) ||
    /\b(appointment|appuntamento|degustazione|tasting|wine\s+tour|cellar|vineyard|vigneti)\b/.test(content)
  )
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

  if (type === 'restaurant') {
    // "Your reservation at Ristorante Lu Stazzu", "booking at X"
    const restaurant = subject.match(/(?:reservation|booking)\s+(?:at|with|for)\s+(.+)$/i);
    if (restaurant) return restaurant[1].trim();
    // "Your reservation confirmation for Casa Bohème Bistro"
    const confirmationFor = subject.match(/(?:reservation|booking)\s+confirmation\s+for\s+(.+)$/i);
    if (confirmationFor) return confirmationFor[1].trim();
  }

  const forwardedFrom = [...body.matchAll(/(?:^|\n)\s*From:\s*([^<\n]{2,80})/gim)].at(-1);
  if (forwardedFrom?.[1]) return forwardedFrom[1].trim();

  const teamSignature = body.match(/(?:team|equipo|équipe)\s+([A-ZÀ-Ý][\p{L}\d& .'-]{2,80})/u);
  return teamSignature?.[1]?.trim() || null;
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
  hasTime: boolean;
} {
  let startDateTime: Date | null = null;
  let endDateTime: Date | null = null;
  let hasTime = false;
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
      [/(?:date|fecha|data|datum|jour|periodo|starts?|begins?|inicio|début|debut|inizio|beginn)[:\s]+([^\n]{5,50})/i, 'start'],
      [/(?:ends?|through|until|fin|final|hasta|jusqu(?:'|’)à|fine|ende|término|termino)[:\s]+([^\n]{5,50})/i, 'end'],
      [/(?:on|el|le|il|am|em|para|pour|per)\s+(?:[\p{L}]+,?\s+)?([\p{L}.]+\s+\d{1,2},?\s+\d{4}(?:\s+(?:at|à|alle|a\s+las|um|às)\s+\d{1,2}[:h.]\d{2}\s*(?:[AP]M)?)?)/iu, 'start'],
      [/(?:on|el|le|il|am|em|para|pour|per)\s+(?:[\p{L}]+,?\s+)?(\d{1,2}\.?\s+(?:de\s+)?[\p{L}.]+\s+(?:de\s+)?\d{4}(?:\s+(?:at|à|alle|a\s+las|um|às)\s+\d{1,2}[:h.]\d{2}\s*(?:[AP]M)?)?)/iu, 'start'],
      // Italian: "in data 23/09/2026 alle 15:00"
      [/(?:in\s+data)\s+(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})\s+(?:alle\s+)?(\d{1,2}[:h.]\d{2})\s*([AP]M)?/i, 'start'],
    );
  }

  for (const [re, role] of labeledPatterns) {
    const m = reservationContent.match(re);
    if (!m) continue;
    const d = parseEmailDate(m[1].trim());
    if (!d) continue;
    if (role === 'start' && !startDateTime) {
      startDateTime = d;
      // Check if the matched string contained a time portion
      if (m[0].match(/\d{1,2}[:h.]\d{2}\s*(?:[AP]M)?/i)) hasTime = true;
    }
    if (role === 'end' && !endDateTime) endDateTime = d;
  }

  if (startDateTime && startDateTime.getUTCHours() === 0 && startDateTime.getUTCMinutes() === 0) {
    // Time label fallback: "Time: 19:30", "Ora: 15:00", "at 7:30 PM", "alle 15:00"
    const time = reservationContent.match(
      /(?:time|ora|heure|hora|uhrzeit)\s*(?::|\n)+\s*(\d{1,2})[:h.](\d{2})\s*([AP]M)?/i,
    ) || reservationContent.match(
      /\bat\s+(\d{1,2})[:h.](\d{2})\s*([AP]M)?\b/i,
    ) || reservationContent.match(
      /\balle\s+(\d{1,2})[:h.](\d{2})\s*([AP]M)?\b/i,
    );
    if (time) {
      let hour = Number(time[1]);
      if (time[3]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (time[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
      startDateTime.setUTCHours(hour, Number(time[2]), 0, 0);
      hasTime = true;
    }
  }

  // Fallback: grab first date-like string in the reservation content as start
  if (!startDateTime) {
    const genericDate = reservationContent.match(/(\d{1,2}\.?\s+(?:de\s+)?[\p{L}.]{3,12}\s+(?:de\s+)?\d{4}|[\p{L}.]{3,12}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/u);
    if (genericDate) startDateTime = parseEmailDate(genericDate[1]);
  }

  // Run time fallback again after generic date fallback in case the date was
  // found without a time (e.g. "Friday 25 September 2026 at 7:30 PM" where the
  // date was matched by the generic pattern but the time wasn't captured).
  if (startDateTime && startDateTime.getUTCHours() === 0 && startDateTime.getUTCMinutes() === 0 && !hasTime) {
    const time = reservationContent.match(
      /(?:time|ora|heure|hora|uhrzeit)\s*(?::|\n)+\s*(\d{1,2})[:h.](\d{2})\s*([AP]M)?/i,
    ) || reservationContent.match(
      /\bat\s+(\d{1,2})[:h.](\d{2})\s*([AP]M)?\b/i,
    ) || reservationContent.match(
      /\balle\s+(\d{1,2})[:h.](\d{2})\s*([AP]M)?\b/i,
    );
    if (time) {
      let hour = Number(time[1]);
      if (time[3]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (time[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
      startDateTime.setUTCHours(hour, Number(time[2]), 0, 0);
      hasTime = true;
    }
  }

  // Fallback for end: grab second date-like string
  if (!endDateTime) {
    const allDates = reservationContent.matchAll(/(\d{1,2}\.\d{1,2}\.\d{4})/g);
    const matches = [...allDates].map(m => parseEmailDate(m[1])).filter(Boolean) as Date[];
    if (matches.length >= 2) endDateTime = matches[1];
  }

  return { startDateTime, endDateTime, hasTime };
}

function extractAddress(body: string): string | null {
  const labeled = body.match(/(?:address|dirección|direccion|adresse|indirizzo|endereço|endereco)\s*(?::|\n)+\s*([^\n]{5,160})/i);
  if (labeled) return labeled[1].trim();

  const structured = body.match(/([^\n]{3,100},\s*\d{1,5},\s*[\p{L} .'-]{2,60},\s*[A-Z]{2}\s+\d{4,6},\s*(?:[A-Z]{2}|[\p{L}]{4,20}))/u);
  return structured?.[1]?.trim() || null;
}

function extractLocation(body: string, type: ReservationType, providerName: string | null): string | null {
  const meetingPoint = body.match(/(?:location del luogo dell'offerta\s*\/\s*nome del punto di incontro|meeting point|punto di incontro|point de rencontre|punto de encuentro|treffpunkt)\s*\n+\s*([^\n]{2,120})/i);
  if (meetingPoint) return meetingPoint[1].trim();

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
    const m = body.match(/pick.?up(?:\s+location)?\s*(?::|\n)+\s*([^\n]{5,80})/i);
    if (m) return m[1].trim();
  }

  // Structured address: "Street 123, 12345 City, ST" (US-style with state code)
  const structuredAddress = body.match(/([^\n]{3,100},\s*\d{1,5},\s*[\p{L} .'-]{2,60},\s*[A-Z]{2}\s+\d{4,6},\s*(?:[A-Z]{2}|[\p{L}]{4,20}))/u);
  if (structuredAddress) return structuredAddress[1].trim();

  // European postal address: "Rue des Pâquis 20, 1201 Genève"
  // or "Rue du Soleil-Levant, 1204, Genève"
  // Require a street prefix (rue, via, calle, etc.) to avoid matching dates.
  const europeanAddress = body.match(
    /(?:rue|via|calle|avenida|av\.?|straße|strasse|road|street|st\.?|piazza|plaza|place|square|boulevard|bd\.?|corso|viale)\s+[\p{L}'’.\s-]{2,50}\d{0,5},?\s*\n?\s*(\d{4,6}),?\s*([A-ZÀ-Ý][\p{L}'’.-]{2,40})/iu,
  );
  if (europeanAddress) return europeanAddress[0].trim();

  // Multi-line address: "Rue du Soleil-Levant\n1204, Genève"
  const multiLineAddress = body.match(
    /(?:rue|via|calle|avenida|av\.?|straße|strasse|road|street|st\.?|piazza|plaza|place|square|boulevard|bd\.?|corso|viale)\s+[\p{L}'’.\s-]{2,50}\d{0,5}\s*\n\s*(\d{4,6}),?\s*([A-ZÀ-Ý][\p{L}'’.-]{2,40})/iu,
  );
  if (multiLineAddress) return `${multiLineAddress[0].split('\n')[0].trim()}, ${multiLineAddress[1]} ${multiLineAddress[2].trim()}`;

  const labeled = body.match(/(?:location|venue|address|place|posizione|ubicación|ubicacion|dirección|direccion|lieu|adresse|luogo|indirizzo|ort|adresse|localização|localizacao|endereço|endereco)\s*(?::|\n)+\s*([^\n]{5,120})/i);
  if (labeled) {
    const val = labeled[1].trim();
    // Skip URLs and Google Maps links — not useful for trip matching
    if (!/^https?:\/\//i.test(val) && !/google\s*maps/i.test(val) && !/share\.google/i.test(val)) return val;
  }

  const postalAddress = body.match(/([A-ZÀ-Ý][\p{L}'’.-]+(?:\s+[A-ZÀ-Ý][\p{L}'’.-]+)*),\s+(?:Provincia di\s+[^\n,]+|[A-Z]{2,3}|[\p{L}'’.-]+(?:\s+[\p{L}'’.-]+)*)\s+\d{4,6}/u);
  if (postalAddress) return postalAddress[0].trim();

  // Fallback: use provider name as location (better than nothing for trip matching)
  if (providerName) return providerName;

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
    // Skip URL-based locations — they're not useful for city extraction
    if (/^https?:\/\//i.test(location) || /google\.com\/maps/i.test(location)) {
      // Fall through to provider name / generic extraction below
    } else {
      // US-style: "Street, City, ST 12345"
      const addressCity = location.match(/,\s*([A-ZÀ-Ý][\p{L}' .-]+),\s*[A-Z]{2}\s+\d{4,6}(?:,|$)/u);
      if (addressCity) return addressCity[1].trim();

      // European: "1201 Genève" or "1204, Genève" — city after a standalone
      // postal code. Require the digit run to be preceded by a separator
      // (start, comma, or space) so we don't match the tail of a longer
      // postal code like "160-0021, Japan" and capture the country as the city.
      const europeanCity = location.match(/(?:^|[, ])\d{4,6}(?:-\d{3,4})?,?\s+([A-ZÀ-Ý][\p{L}'’.-]{2,40})/u);
      if (europeanCity) return europeanCity[1].trim();

      const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
      if (parts.length > 1 && /^(?:\d|via\b|rue\b|calle\b|avenida\b|av\.?\b|straße\b|strasse\b|road\b|street\b|st\.?\b|piazza\b|plaza\b|place\b|square\b)/i.test(parts[0])) {
        const lastPart = parts.at(-1) ?? '';
        const hasCountrySuffix = /^(?:[A-Z]{2}|italy|italia|france|spain|germany|switzerland|japan|portugal|greece)$/i.test(lastPart);
        const cityPart = hasCountrySuffix && parts.length > 2 ? parts.at(-2) : lastPart;
        return cityPart?.replace(/^\d{4,6}\s+|\s+\d{3,6}(?:-\d{3,4})?$/g, '').trim() || parts[0];
      }
    }
  }

  // Generic: look for "destination:" label specifically (not "city" which matches billing addresses)
  const m = body.match(/(?:destination)[:\s]+([A-Za-z ,]{3,40})/i);
  if (m) return m[1].split(',')[0].trim();

  // Final fallback: first part of location, but skip URLs
  if (location && !/^https?:\/\//i.test(location) && !/google\.com\/maps/i.test(location)) {
    return location.split(',')[0].trim();
  }
  return null;
}

const COUNTRY_ALIASES: Record<string, string> = {
  it: 'Italy', italy: 'Italy', italia: 'Italy', italie: 'Italy', italien: 'Italy', itália: 'Italy',
  switzerland: 'Switzerland', suisse: 'Switzerland', svizzera: 'Switzerland', schweiz: 'Switzerland', suiza: 'Switzerland',
  france: 'France', francia: 'France', frankreich: 'France', frança: 'France',
  spain: 'Spain', españa: 'Spain', espana: 'Spain', espagne: 'Spain', spanien: 'Spain', spagna: 'Spain',
  germany: 'Germany', deutschland: 'Germany', allemagne: 'Germany', germania: 'Germany', alemania: 'Germany',
  portugal: 'Portugal',
  greece: 'Greece', grecia: 'Greece', grèce: 'Greece', griechenland: 'Greece',
  netherlands: 'Netherlands', nederland: 'Netherlands', niederlande: 'Netherlands',
  japan: 'Japan', japon: 'Japan', japón: 'Japan', giappone: 'Japan',
  'united kingdom': 'United Kingdom', uk: 'United Kingdom', england: 'United Kingdom',
  'united states': 'United States', usa: 'United States',
};

const CITY_TO_COUNTRY: Record<string, string> = {
  // Switzerland
  'genève': 'Switzerland', geneva: 'Switzerland', zürich: 'Switzerland', zurich: 'Switzerland',
  basel: 'Switzerland', bern: 'Switzerland', lausanne: 'Switzerland', lugano: 'Switzerland',
  // Italy
  rome: 'Italy', roma: 'Italy', milan: 'Italy', milano: 'Italy', olbia: 'Italy',
  cagliari: 'Italy', palermo: 'Italy', naples: 'Italy', napoli: 'Italy', florence: 'Italy',
  firenze: 'Italy', venice: 'Italy', venezia: 'Italy', bologna: 'Italy', turin: 'Italy',
  torino: 'Italy', genoa: 'Italy', genova: 'Italy', palau: 'Italy', stintino: 'Italy',
  alghero: 'Italy', sardinia: 'Italy', sardegna: 'Italy',
  'la pelosa': 'Italy', lapelosa: 'Italy', capichera: 'Italy',
  // France
  paris: 'France', lyon: 'France', marseille: 'France', nice: 'France', bordeaux: 'France',
  // Spain
  madrid: 'Spain', barcelona: 'Spain', sevilla: 'Spain', valencia: 'Spain',
  // Germany
  berlin: 'Germany', munich: 'Germany', münchen: 'Germany', hamburg: 'Germany',
  frankfurt: 'Germany', cologne: 'Germany', köln: 'Germany',
};

function extractDestinationCountry(body: string, location: string | null): string | null {
  const address = body.match(/(?:address|dirección|direccion|adresse|indirizzo|endereço|endereco)\s*(?::|\n)+\s*([^\n]{3,160})/i)?.[1];
  const source = `${address ?? ''} ${location ?? ''}`.toLowerCase();
  for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
    if (new RegExp(`(?:^|[^\\p{L}])${alias}(?:$|[^\\p{L}])`, 'iu').test(source)) return country;
  }
  // Fallback: infer country from city name
  if (location) {
    const cityLower = location.toLowerCase().trim();
    for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
      if (cityLower.includes(city)) return country;
    }
  }
  return null;
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

// ─── Title construction ───────────────────────────────────────────────────────

/**
 * Extract a venue/activity name directly from the email body, independent of
 * the subject line. Returns the most specific name found, or null. Patterns
 * are intentionally conservative — when in doubt, return null and let the
 * caller fall back to provider name / cleaned subject.
 */
function extractVenueName(body: string): string | null {
  // "reservation/prenotazione/booking for/per/pour/para/de "X" below/..."
  const namedReservation = body.match(
    /(?:reservation|prenotazione|booking)\s+(?:for|per|pour|para|de)\s+["“”']{0,2}([^\n"”“']{4,120}?)["“”']{0,2}\s+(?:below|di seguito|ci-dessous|a continuación)/i,
  );
  if (namedReservation) return cleanVenueName(namedReservation[1]);

  // Italian: "La tua prenotazione per La Pelosa è stata confermata."
  const itPrenotazione = body.match(
    /la\s+tua\s+prenotazione\s+per\s+([A-ZÀ-Ý][\p{L}'’.\s-]{2,60}?)(?:\s+è\s+stata|\s+e'\s+stata|\.\s)/iu,
  );
  if (itPrenotazione) return cleanVenueName(itPrenotazione[1]);

  // Activity leading name before a date:
  //   "Walking tour on Sunday, September 20, 2026 ..."
  //   "Excursión en barco para martes, 22 de septiembre de 2026 ..."
  //   "Table for 2 on Tuesday, September 22, 2026 ..."  (skip — restaurant)
  // Name class excludes newlines so we don't capture boilerplate on a prior line.
  const activityOnDate = body.match(
    /([A-ZÀ-Ý][\p{L}'’.& -]{3,80}?)\s+(?:on|para|el|le|il|am|em)\s+(?:[\p{L}]+,?\s+)?(?:\d{1,2}\s+(?:de\s+)?[\p{L}.]+\s+(?:de\s+)?\d{4}|[\p{L}.]+\s+\d{1,2},?\s+\d{4})/iu,
  );
  if (activityOnDate) {
    const name = cleanVenueName(activityOnDate[1]);
    // Skip restaurant "Table for N" / "Mesa para N" / "Tavolo per N" — those
    // are not venue names; the restaurant's provider/subject handles the title.
    if (name && !/\b(?:table|mesa|tavolo)\b/i.test(name)) return name;
  }

  // Standalone tour/activity name on its own line, immediately followed by a
  // "Date:" line. e.g.:
  //   "Tokyo Night Food Tour\nDate: December 12, 2027 at 7:00 PM"
  const standaloneTour = body.match(
    /\n\s*([A-ZÀ-Ý][\p{L}'’.& -]{3,80}?)\s*\n\s*(?:date|fecha|data|datum)\s*[:\n]/iu,
  );
  if (standaloneTour) return cleanVenueName(standaloneTour[1]);

  return null;
}

/** Trim, collapse internal whitespace, strip a trailing connector word. */
function cleanVenueName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\s+(?:at|@|on|for|with|-|–|—)\s*$/i, '')
    .trim();
}

/**
 * Last-resort subject fallback: strip forwarding prefixes, bracketed prefixes,
 * and common boilerplate so a generic subject like "Dinner reservation
 * confirmed" becomes "Dinner". If everything is stripped, return the original
 * (stripped of forwarding prefixes only) so we never produce an empty title.
 */
function cleanSubjectForTitle(subject: string): string {
  // 1. Strip leading Fwd:/Re:
  let s = subject.replace(/^(?:fwd?:|re:)\s*/i, '').trim();

  // 2. Strip a leading bracketed prefix "[Restaurant Les Armures] ..."
  const bracketed = s.match(/^\[[^\]]+\]\s*(.+)$/);
  if (bracketed) s = bracketed[1].trim();

  // Remember this as the safe fallback before boilerplate stripping.
  const fallback = s;

  // 3. Remove boilerplate tokens/phrases (case-insensitive).
  const boilerplate = [
    /\breservation\s+confirmed\b/gi,
    /\bbooking\s+confirmed\b/gi,
    /\bappointment\s+confirmed\b/gi,
    /\bdinner\s+reservation\s+confirmed\b/gi,
    /\bactivity\s+reservation\s+confirmed\b/gi,
    /\bis\s+confirmed\b/gi,
    /\bconfirmed\b/gi,
    /\bconfirmation\b/gi,
    /\byour\s+appointment\s+information\b/gi,
    /\bconferma\s+prenotazione\s+spiaggia\s+n\.?\s*\d+\b/gi,
    /\bconferma\s+prenotazione\b/gi,
    /\bconfirmaci[óo]n\s+de\s+actividad\b/gi,
    /\bconfirmaci[óo]n\b/gi,
    /\bzug\s+reservierung\b/gi,
    /\bbest[äa]tigt\b/gi,
    /\breservierung\b/gi,
    /\bprenotazione\b/gi,
    /\breservation\b/gi,
    /\bbooking\b/gi,
  ];
  for (const re of boilerplate) s = s.replace(re, '');

  // 4. Collapse whitespace, strip leftover punctuation/connector words.
  s = s
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—:|]\s*$/g, '')
    .replace(/^\s*[-–—:|]\s*/g, '')
    .replace(/\s+(?:at|@|on|for|with|of)\s*$/i, '')
    .trim();

  return s.length >= 3 ? s : fallback;
}

/** Extract a rail route ({from, to}) from labeled departure/arrival lines. */
function extractRailRoute(body: string): { from: string | null; to: string | null } {
  const fromMatch = body.match(/(?:abfahrt|from|origen|d[ée]part|partenza|abfahrt)\s*[:\n]\s*([^\n]{3,60})/i);
  const toMatch = body.match(/(?:ankunft|to|destino|arriv[ée]e|arrivo)\s*[:\n]\s*([^\n]{3,60})/i);
  const clean = (s: string | null) => s?.replace(/\s+/g, ' ').replace(/\b(?:Hauptbahnhof|Hbf|Station|Stazione|Estaci[óo]n|Gare)\b/gi, '').replace(/[,.\s]+$/g, '').trim() || null;
  return { from: clean(fromMatch?.[1] ?? null), to: clean(toMatch?.[1] ?? null) };
}

/** Title-case a single city name (only the car type uses this). */
function titleCaseCity(city: string): string {
  return city
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Build a human-friendly event title from the structured fields already
 * extracted by the parser. Falls back to a cleaned subject line when no
 * structured name is available. Format is `Provider (City)` per type.
 */
function buildTitle(args: {
  type: ReservationType;
  subject: string;
  body: string;
  providerName: string | null;
  venueName: string | null;
  destinationCity: string | null;
  destinationCountry: string | null;
  airlineCode: string | null;
  flightNumber: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
}): string {
  const {
    type, subject, body, providerName, venueName,
    destinationCity, destinationCountry,
    airlineCode, flightNumber, departureAirport, arrivalAirport,
  } = args;

  /** Append " (City)" when the city is meaningful and not redundant. */
  const withCity = (name: string): string => {
    if (!destinationCity) return name;
    const city = destinationCity.trim();
    if (!city) return name;
    // Omit when city equals the country (defends against residual bugs).
    if (destinationCountry && city.toLowerCase() === destinationCountry.toLowerCase()) return name;
    // Omit when city equals the name (e.g. "Capichera (Capichera)").
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (norm(city) === norm(name)) return name;
    return `${name} (${city})`;
  };

  switch (type) {
    case 'flight': {
      if (departureAirport && arrivalAirport) {
        const route = `${departureAirport} → ${arrivalAirport}`;
        if (airlineCode && flightNumber) return `${airlineCode}${flightNumber}: ${route}`;
        return route;
      }
      if (airlineCode && flightNumber) return `${airlineCode}${flightNumber}`;
      return cleanSubjectForTitle(subject);
    }

    case 'car': {
      if (destinationCity) return `${titleCaseCity(destinationCity)} Car Rental`;
      return cleanSubjectForTitle(subject);
    }

    case 'rail': {
      const { from, to } = extractRailRoute(body);
      if (from && to) return `Train: ${from} → ${to}`;
      if (providerName) return withCity(`Rail: ${providerName}`);
      return cleanSubjectForTitle(subject);
    }

    case 'hotel': {
      if (providerName) return withCity(providerName);
      return withCity(cleanSubjectForTitle(subject));
    }

    case 'restaurant': {
      const name = providerName || venueName;
      if (name) return withCity(name);
      return withCity(cleanSubjectForTitle(subject));
    }

    case 'activity': {
      const name = venueName || providerName;
      if (name) return withCity(name);
      return withCity(cleanSubjectForTitle(subject));
    }

    case 'cruise': {
      const name = providerName ? `Cruise: ${providerName}` : null;
      if (name) return withCity(name);
      return withCity(cleanSubjectForTitle(subject));
    }

    case 'transport': {
      const name = providerName ? `Transport: ${providerName}` : null;
      if (name) return withCity(name);
      return withCity(cleanSubjectForTitle(subject));
    }

    case 'other': {
      const name = providerName || venueName;
      if (name) return withCity(name);
      return withCity(cleanSubjectForTitle(subject));
    }
  }

  return cleanSubjectForTitle(subject);
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

  const { startDateTime, endDateTime, hasTime } = extractDates(body, type);
  console.log('[email-parser] Dates:', { startDateTime, endDateTime, hasTime });

  const address = extractAddress(body);
  const location = extractLocation(body, type, providerName) ?? address;
  console.log('[email-parser] Location:', location);

  const destinationCity = extractDestinationCity(body, type, location);
  const destinationCountry = extractDestinationCountry(body, address ?? location);
  console.log('[email-parser] Destination city:', destinationCity);
  console.log('[email-parser] Destination country:', destinationCountry);

  let airlineCode: string | null = null;
  let flightNumber: string | null = null;
  let departureAirport: string | null = null;
  let arrivalAirport: string | null = null;

  if (type === 'flight') {
    const fd = extractFlightDetails(body, subject);
    airlineCode = fd.airlineCode;
    flightNumber = fd.flightNumber;
    departureAirport = fd.departureAirport;
    arrivalAirport = fd.arrivalAirport;
  }

  const venueName = extractVenueName(body);

  const title = buildTitle({
    type,
    subject,
    body,
    providerName,
    venueName,
    destinationCity,
    destinationCountry,
    airlineCode,
    flightNumber,
    departureAirport,
    arrivalAirport,
  });
  console.log('[email-parser] Title:', title);

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
    destinationCountry,
    address,
    departureAirport,
    arrivalAirport,
    airlineCode,
    flightNumber,
    notes,
    hasTime,
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
