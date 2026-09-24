import './style.css';
import { Globe } from './globe.js';
import { fetchWeather, searchPlaces, reverseGeocode, WMO_CODES, weatherEmoji } from './weather.js';

const canvas = document.getElementById('globe-canvas');
const panel = document.getElementById('weather-panel');
const panelLoading = document.getElementById('panel-loading');
const panelContent = document.getElementById('panel-content');
const panelError = document.getElementById('panel-error');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const locateBtn = document.getElementById('locate-btn');
const hint = document.getElementById('hint');
const coordTip = document.getElementById('coord-tip');

let searchTimer = null;
let searchController = null;
let weatherController = null;
let activeIndex = -1;

const globe = new Globe(canvas, {
  onSelect: handleSelect,
  onHover: handleHover,
});

/* ── Panel ── */

function openPanel() {
  panel.hidden = false;
  panelLoading.hidden = false;
  panelContent.hidden = true;
  panelError.hidden = true;
  hint.classList.add('is-hidden');
}

function closePanel() {
  panel.hidden = true;
  if (!globe.hasSelection()) hint.classList.remove('is-hidden');
}

document.getElementById('panel-close').addEventListener('click', () => {
  globe.clearSelection();
  closePanel();
});

async function handleSelect(lat, lon, label) {
  weatherController?.abort();
  weatherController = new AbortController();
  const signal = weatherController.signal;
  openPanel();
  try {
    const data = await fetchWeather(lat, lon, { signal });
    if (signal.aborted) return;
    renderWeather(data, lat, lon, label);
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) return;
    panelLoading.hidden = true;
    panelError.hidden = false;
  }
}

function renderWeather(data, lat, lon, label) {
  const cur = data.current;
  const code = cur.weather_code;

  document.getElementById('location-name').textContent =
    label || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  document.getElementById('location-coords').textContent =
    `${lat.toFixed(4)}° N/S  ·  ${lon.toFixed(4)}° E/W`
      .replace('N/S', lat >= 0 ? 'N' : 'S')
      .replace('E/W', lon >= 0 ? 'E' : 'W');
  document.getElementById('current-temp').textContent = `${Math.round(cur.temperature_2m)}°`;
  document.getElementById('current-condition').textContent = WMO_CODES[code] || 'Unknown';
  document.getElementById('feels-like').textContent = `Feels ${Math.round(cur.apparent_temperature)}°`;
  document.getElementById('weather-emoji').textContent = weatherEmoji(code);
  document.getElementById('detail-humidity').textContent = `${cur.relative_humidity_2m}%`;
  document.getElementById('detail-wind').textContent = `${Math.round(cur.wind_speed_10m)} km/h`;
  document.getElementById('detail-precip').textContent = `${cur.precipitation} mm`;
  document.getElementById('detail-pressure').textContent = `${Math.round(cur.pressure_msl)} hPa`;

  if (data.timezone_abbreviation) {
    document.getElementById('forecast-tz').textContent = data.timezone_abbreviation;
  }

  const list = document.getElementById('forecast-list');
  list.innerHTML = '';
  const days = data.daily;
  for (let i = 0; i < days.time.length; i++) {
    const d = new Date(days.time[i] + 'T00:00:00');
    const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en', { weekday: 'short' });
    const row = document.createElement('div');
    row.className = 'fc-row';
    row.innerHTML = `
      <span class="fc-day">${dayName}</span>
      <span class="fc-icon">${weatherEmoji(days.weather_code[i])}</span>
      <span class="fc-cond">${WMO_CODES[days.weather_code[i]] || ''}</span>
      <span class="fc-temps">
        <span class="fc-hi">${Math.round(days.temperature_2m_max[i])}°</span>
        <span class="fc-lo">${Math.round(days.temperature_2m_min[i])}°</span>
      </span>
    `;
    list.appendChild(row);
  }

  panelLoading.hidden = true;
  panelError.hidden = true;
  panelContent.hidden = false;
}

/* ── Hover tooltip ── */

function handleHover(lat, lon) {
  if (globe.hasSelection()) {
    coordTip.hidden = true;
    return;
  }
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  coordTip.textContent = `${Math.abs(lat).toFixed(2)}°${ns}  ${Math.abs(lon).toFixed(2)}°${ew}`;
  coordTip.hidden = false;
}

canvas.addEventListener('pointermove', (e) => {
  if (!coordTip.hidden) {
    coordTip.style.left = `${e.clientX + 14}px`;
    coordTip.style.top = `${e.clientY - 12}px`;
  }
});
canvas.addEventListener('pointerleave', () => {
  coordTip.hidden = true;
});
canvas.addEventListener('pointerdown', () => {
  coordTip.hidden = true;
});

/* ── Search ── */

function showResults(html) {
  searchResults.innerHTML = html;
  searchResults.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
  activeIndex = -1;
}

function hideResults() {
  searchResults.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
  activeIndex = -1;
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchController?.abort();
  const q = searchInput.value.trim();
  if (q.length < 2) {
    hideResults();
    return;
  }
  searchTimer = setTimeout(async () => {
    searchController = new AbortController();
    const signal = searchController.signal;
    try {
      const places = await searchPlaces(q, { signal });
      if (signal.aborted) return;
      renderResults(places, q);
    } catch (err) {
      if (err.name === 'AbortError') return;
      hideResults();
    }
  }, 280);
});

function renderResults(places, query) {
  if (!places.length) {
    showResults(`<div class="sr-empty">No results for “${escapeHtml(query)}”</div>`);
    return;
  }

  const items = places.slice(0, 7).map((p, i) => {
    const sub = [p.admin1, p.country].filter(Boolean).join(', ');
    const latS = `${Math.abs(p.latitude).toFixed(1)}°${p.latitude >= 0 ? 'N' : 'S'}`;
    const lonS = `${Math.abs(p.longitude).toFixed(1)}°${p.longitude >= 0 ? 'E' : 'W'}`;
    return `
      <button class="sr-item" role="option" data-idx="${i}" data-lat="${p.latitude}" data-lon="${p.longitude}" data-name="${escapeHtml(p.name)}">
        <span class="sr-dot"></span>
        <span class="sr-text">
          <span class="sr-name">${highlightMatch(p.name, query)}</span>
          ${sub ? `<span class="sr-sub">${escapeHtml(sub)}</span>` : ''}
        </span>
        <span class="sr-coords">${latS} ${lonS}</span>
      </button>
    `;
  }).join('');

  showResults(items);
}

searchResults.addEventListener('click', (e) => {
  const item = e.target.closest('.sr-item');
  if (!item) return;
  selectSearchResult(item);
});

function selectSearchResult(item) {
  const lat = parseFloat(item.dataset.lat);
  const lon = parseFloat(item.dataset.lon);
  const name = item.dataset.name;
  searchInput.value = name;
  hideResults();
  globe.flyTo(lat, lon);
  setTimeout(() => handleSelect(lat, lon, name), 750);
}

searchInput.addEventListener('keydown', (e) => {
  const items = [...searchResults.querySelectorAll('.sr-item')];

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!items.length) return;
    activeIndex = (activeIndex + 1) % items.length;
    items.forEach((el, i) => el.setAttribute('aria-selected', i === activeIndex));
    items[activeIndex]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!items.length) return;
    activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
    items.forEach((el, i) => el.setAttribute('aria-selected', i === activeIndex));
    items[activeIndex]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex >= 0 && items[activeIndex]) {
      selectSearchResult(items[activeIndex]);
    } else if (items[0]) {
      selectSearchResult(items[0]);
    }
  } else if (e.key === 'Escape') {
    hideResults();
    searchInput.blur();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap') && !e.target.closest('.search-results')) {
    hideResults();
  }
});

/* keyboard: "/" focuses search */
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === 'Escape' && !panel.hidden && document.activeElement !== searchInput) {
    globe.clearSelection();
    closePanel();
  }
});

/* ── Geolocation ── */

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return;
  locateBtn.classList.add('is-loading');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      locateBtn.classList.remove('is-loading');
      globe.flyTo(latitude, longitude);
      let label = null;
      try { label = await reverseGeocode(latitude, longitude); } catch {}
      setTimeout(() => handleSelect(latitude, longitude, label), 750);
    },
    () => locateBtn.classList.remove('is-loading'),
    { timeout: 8000, enableHighAccuracy: false }
  );
});

/* ── Utils ── */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function highlightMatch(text, query) {
  const escaped = escapeHtml(text);
  const q = escapeHtml(query);
  const idx = escaped.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return escaped;
  return (
    escaped.slice(0, idx) +
    '<strong>' + escaped.slice(idx, idx + q.length) + '</strong>' +
    escaped.slice(idx + q.length)
  );
}

globe.start();
