import { NextRequest, NextResponse } from 'next/server';

const cache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
// Bump this when changing query strategy to force fresh photo selection.
const CACHE_VERSION = 'v9';

interface GeocodeResult {
  geometry: {
    location: { lat: number; lng: number };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface NearbyResult {
  name?: string;
}

// Clean up raw location strings
function cleanLocation(raw: string): string | null {
  let s = raw.trim();

  if (/no destination|not specified|unknown|n\/a/i.test(s)) return null;

  s = s.replace(/^\d+\s+/, '');
  s = s.replace(/\b\d{4,5}\b/g, '');
  s = s.replace(/\b[A-Z]{2}\s+\d{4,5}\b/g, '');

  const parts = s
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) return null;

  const streetPrefixes = /^(via|street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl|court|ct|highway|hwy|route|rt)\b/i;
  let startIdx = 0;
  if (streetPrefixes.test(parts[0]) && parts.length > 1) {
    startIdx = 1;
  }

  const cleaned = parts.slice(startIdx, startIdx + 2).join(' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

interface MajorCityResult {
  name: string;
  isMajorCity: boolean;
}

// Use Geocoding + Nearby Search to find the nearest major city.
// Also returns whether the input itself is the major city (prominent locality).
async function resolveMajorCity(rawLocation: string, apiKey: string): Promise<MajorCityResult | null> {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(rawLocation)}&key=${apiKey}`;
  const geoRes = await fetch(geocodeUrl);
  if (!geoRes.ok) return null;
  const geoData = await geoRes.json();
  const geoResults = geoData.results as GeocodeResult[];
  if (geoResults.length === 0) return null;

  const { lat, lng } = geoResults[0].geometry.location;

  const countryComp = geoResults[0].address_components.find((c) =>
    c.types.includes('country')
  );
  const country = countryComp?.long_name || '';

  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50000&type=locality&rankby=prominence&key=${apiKey}`;
  const nearbyRes = await fetch(nearbyUrl);
  if (!nearbyRes.ok) return null;
  const nearbyData = await nearbyRes.json();
  const nearbyResults = nearbyData.results as NearbyResult[];

  if (nearbyResults.length > 0 && nearbyResults[0].name) {
    const cityName = nearbyResults[0].name;
    const result = country ? `${cityName}, ${country}` : cityName;
    const isMajorCity = rawLocation.toLowerCase().includes(cityName.toLowerCase()) ||
                        cityName.toLowerCase().includes(rawLocation.toLowerCase());
    console.log('[location-photo] Resolved to major city:', result, isMajorCity ? '(input is major city)' : '(input is smaller area)');
    return { name: result, isMajorCity };
  }

  const localityComp = geoResults[0].address_components.find((c) =>
    c.types.includes('locality') || c.types.includes('administrative_area_level_2')
  );
  const adminComp = geoResults[0].address_components.find((c) =>
    c.types.includes('administrative_area_level_1')
  );

  const cityName = localityComp?.long_name || adminComp?.long_name || '';
  if (cityName) {
    const result = country ? `${cityName}, ${country}` : cityName;
    console.log('[location-photo] Fallback to geocode component:', result);
    return { name: result, isMajorCity: true };
  }

  return null;
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  alt: string;
  src: { large: string; large2x: string; original: string };
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

// Curated photo IDs are high-quality images hand-picked by Pexels editors.
// We fetch them once and cache them; if a search result matches a curated ID,
// we strongly prefer it.
let curatedIds: { ids: Set<number>; ts: number } | null = null;
const CURATED_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

async function getCuratedPhotoIds(apiKey: string): Promise<Set<number>> {
  if (curatedIds && Date.now() - curatedIds.ts < CURATED_CACHE_TTL) {
    return curatedIds.ids;
  }

  const url = `https://api.pexels.com/v1/curated?per_page=80`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    console.log('[location-photo] Pexels curated fetch failed:', res.status);
    return new Set();
  }

  const data: PexelsResponse = await res.json();
  const ids = new Set((data.photos || []).map((p) => p.id));
  console.log('[location-photo] Fetched', ids.size, 'curated Pexels IDs');
  curatedIds = { ids, ts: Date.now() };
  return ids;
}

// Detect coastal/resort locations from the cleaned string.
function isCoastalLocation(query: string): boolean {
  return /\b(beach|island|coast|coastal|marina|bay|cove|harbor|port|shore|resort|sea|ocean|smeralda|gallura|hilton head|florida|carolina|sardinia|hawaii|maldives|caribbean|mediterranean)\b/i.test(query);
}

// Fetch a high-quality photo from Wikipedia/Wikimedia Commons for a major city.
// Wikipedia's "lead image" for a city article is usually an iconic, curated
// photo of the city's most famous feature (Eiffel Tower for Paris, Lake
// Geneva for Geneva, beach for Fort Lauderdale). No API key required.
async function findWikipediaPhoto(searchQuery: string): Promise<string | null> {
  const cityOnly = searchQuery.split(',')[0].trim();

  // Step 1: Search Wikipedia for the best matching article.
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cityOnly)}&srlimit=3&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    console.log('[location-photo] Wikipedia search failed:', searchRes.status);
    return null;
  }

  interface WikiSearchResult {
    title: string;
  }
  interface WikiSearchResponse {
    query?: {
      search?: WikiSearchResult[];
    };
  }
  const searchData: WikiSearchResponse = await searchRes.json();
  const results = searchData.query?.search || [];
  if (results.length === 0) {
    console.log('[location-photo] No Wikipedia article for', cityOnly);
    return null;
  }

  // Step 2: Get the main (lead) image for the top article.
  const bestTitle = results[0].title;
  const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestTitle)}&prop=pageimages&format=json&pithumbsize=1200&origin=*`;
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    console.log('[location-photo] Wikipedia image fetch failed:', imageRes.status);
    return null;
  }

  interface WikiPage {
    thumbnail?: { source: string; width: number; height: number };
  }
  interface WikiImageResponse {
    query?: {
      pages?: Record<string, WikiPage>;
    };
  }
  const imageData: WikiImageResponse = await imageRes.json();
  const pages = imageData.query?.pages || {};
  const page = Object.values(pages)[0];

  if (!page?.thumbnail?.source) {
    console.log('[location-photo] No Wikipedia lead image for', bestTitle);
    return null;
  }

  console.log('[location-photo] Wikipedia photo for', cityOnly, '->', bestTitle, 'resolution', page.thumbnail.width, 'x', page.thumbnail.height);
  return page.thumbnail.source;
}

// Fetch a high-quality travel photo from Pexels for coastal/resort areas.
// Pexels has great beach/aerial/nature stock for non-urban destinations.
async function findPexelsPhoto(searchQuery: string, isCoastal: boolean): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log('[location-photo] No PEXELS_API_KEY configured');
    return null;
  }

  const cityOnly = searchQuery.split(',')[0].trim();
  const fullQuery = searchQuery.trim();

  const queries = isCoastal
    ? [
        `${cityOnly} beach`,
        `${cityOnly} coast`,
        `${cityOnly} aerial`,
        `${cityOnly} travel`,
        fullQuery,
      ]
    : [
        `${cityOnly} travel`,
        `${cityOnly} nature`,
        `${cityOnly} aerial`,
        fullQuery,
      ];

  const results = await Promise.all(
    queries.map((q) =>
      fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&orientation=landscape&size=large&per_page=10`, {
        headers: { Authorization: apiKey },
      }).then((res) => (res.ok ? (res.json() as Promise<PexelsResponse>) : { photos: [] }))
    )
  );

  const allPhotos: PexelsPhoto[] = [];
  const seenIds = new Set<number>();
  for (const data of results) {
    for (const photo of data.photos || []) {
      if (!seenIds.has(photo.id)) {
        seenIds.add(photo.id);
        allPhotos.push(photo);
      }
    }
  }

  console.log('[location-photo] Pexels collected', allPhotos.length, 'unique candidates for', cityOnly, isCoastal ? '(coastal)' : '(inland)');

  if (allPhotos.length === 0) {
    console.log('[location-photo] No Pexels results for', cityOnly);
    return null;
  }

  const best = await pickBestPexelsPhoto(allPhotos, apiKey, cityOnly);
  return best;
}

// Score each Pexels photo: curated, then alt-text relevance, then resolution.
async function pickBestPexelsPhoto(photos: PexelsPhoto[], apiKey: string, cityName: string): Promise<string | null> {
  const curatedIds = await getCuratedPhotoIds(apiKey);
  const landscape = photos.filter((p) => p.width >= p.height);
  const candidates = landscape.length > 0 ? landscape : photos;
  const cityLower = cityName.toLowerCase();

  const scored = candidates.map((p) => {
    const resolution = Math.min(p.width * p.height, 50_000_000);
    const isCurated = curatedIds.has(p.id);
    const altLower = (p.alt || '').toLowerCase();
    const altMatchesCity = altLower.includes(cityLower);
    const altMatchesLandmark = /beach|coast|shore|island|bay|ocean|sea|lake|aerial|landscape|scenic|landmark|tower|bridge|cathedral|palace|monument/.test(altLower);

    const score =
      resolution +
      (isCurated ? 100_000_000 : 0) +
      (altMatchesCity ? 50_000_000 : 0) +
      (altMatchesLandmark ? 25_000_000 : 0);

    return { photo: p, score, isCurated, altMatchesCity, altMatchesLandmark };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].photo;
  console.log(
    '[location-photo] Pexels selected',
    best.id,
    curatedIds.has(best.id) ? '(curated)' : '(search)',
    'resolution', best.width, 'x', best.height,
    'alt:', best.alt?.slice(0, 60)
  );

  return best.src.large2x || best.src.large || best.src.original;
}

export async function GET(request: NextRequest) {
  const rawLocation = request.nextUrl.searchParams.get('location');
  if (!rawLocation) {
    return NextResponse.json({ error: 'location required' }, { status: 400 });
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Maps API key not configured' }, { status: 500 });
  }

  const cleaned = cleanLocation(rawLocation);
  if (!cleaned) {
    return NextResponse.json({ error: 'No valid location' }, { status: 404 });
  }

  const cacheKey = `${cleaned.toLowerCase().trim()}:${CACHE_VERSION}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.redirect(cached.url);
  }

  try {
    // Step 1: Resolve the nearest major city for fallback if needed.
    let majorCityName: string | null = null;
    const majorCityResult = await resolveMajorCity(cleaned, key);
    if (majorCityResult) {
      majorCityName = majorCityResult.name;
    }

    const coastal = isCoastalLocation(cleaned);

    // Step 2: Try Wikipedia first for all locations. Wikipedia articles for
    // cities, towns, and islands usually have an iconic lead image that matches
    // what the destination is famous for (beach, landmark, lake, etc.).
    let photoUrl = await findWikipediaPhoto(cleaned);
    let searchQuery = cleaned;
    let source = 'Wikipedia';

    // Step 3: If Wikipedia has no image, fall back to Pexels based on location type.
    if (!photoUrl) {
      console.log('[location-photo] Wikipedia returned no photo, falling back to Pexels');
      photoUrl = await findPexelsPhoto(cleaned, coastal);
      source = coastal ? 'Pexels coastal' : 'Pexels inland';
    }

    // Step 4: If the original location has no photos, fall back to the nearest major city.
    if (!photoUrl && majorCityName && majorCityName !== cleaned) {
      console.log('[location-photo] Original location had no photos, using major city:', majorCityName);
      searchQuery = majorCityName;
      photoUrl = await findWikipediaPhoto(majorCityName);
      source = 'Wikipedia fallback';
      if (!photoUrl) {
        photoUrl = await findPexelsPhoto(majorCityName, false);
        source = 'Pexels fallback';
      }
    }

    console.log('[location-photo] Final search:', searchQuery, '(from', cleaned, ')', `[${source}]`);

    if (!photoUrl) {
      return NextResponse.json({ error: 'No photos found' }, { status: 404 });
    }

    cache.set(cacheKey, { url: photoUrl, ts: Date.now() });
    return NextResponse.redirect(photoUrl);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch location photo' }, { status: 500 });
  }
}
