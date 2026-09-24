const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search';

const DEFAULT_TIMEOUT = 8000;

async function fetchWithTimeout(url, { signal, timeout = DEFAULT_TIMEOUT } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const onExternalAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch (err) {
    if (err.name === 'AbortError' && signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

export const WMO_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export function weatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code === 85 || code === 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

export async function fetchWeather(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,pressure_msl,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
    forecast_days: '7',
  });

  const res = await fetchWithTimeout(`${FORECAST_BASE}?${params}`, { signal });
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

export async function searchPlaces(query, { signal } = {}) {
  const params = new URLSearchParams({
    name: query,
    count: '8',
    language: 'en',
    format: 'json',
  });

  const res = await fetchWithTimeout(`${GEOCODING_BASE}?${params}`, { signal, timeout: 5000 });
  if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

export async function reverseGeocode(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  const res = await fetchWithTimeout(url, { timeout: 5000 });
  if (!res.ok) throw new Error('Reverse geocode failed');
  const data = await res.json();
  return [data.city || data.locality, data.principalSubdivision].filter(Boolean).join(', ') || null;
}
