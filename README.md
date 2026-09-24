# 🌍 WeatherSphere

**Explore weather on an interactive 3D globe.** Not another search box — click anywhere on Earth and see live weather instantly.

## ✨ Features

- **Interactive 3D globe** — drag to rotate, scroll to zoom, click any point for live weather
- **Smart search** — autocomplete powered by Open-Meteo geocoding
- **"Use my location"** — one-tap geolocation
- **7-day forecast** — daily highs, lows, and conditions
- **Zero backend** — runs fully client-side, deploy anywhere
- **No API key** — uses [Open-Meteo](https://open-meteo.com/) (free, open, no signup)
- **Responsive** — works on desktop and mobile
- **Keyboard shortcuts** — `Enter` to search, `Esc` to close, double-click to deselect

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## 🛠️ Tech Stack

| Layer | Choice |
|-------|--------|
| Build | Vite |
| 3D | Three.js |
| Weather API | Open-Meteo (free, no key) |
| Geocoding | Open-Meteo + BigDataCloud |
| Styling | Vanilla CSS (custom properties) |

## 📁 Structure

```
src/
├── main.js      # App entry, UI wiring, event handlers
├── globe.js     # Three.js globe (scene, interaction, markers)
├── weather.js   # Open-Meteo API client, WMO codes, emoji map
└── style.css    # Full stylesheet with dark theme
```

## 📖 Data Sources

- **Weather:** [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- **Search:** [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- **Reverse geocode:** [BigDataCloud Client API](https://www.bigdatacloud.com/geocoding-client-api)

All free, no API key required.

## 🤝 Contributing

Issues and PRs welcome. Keep it vanilla — no framework lock-in.

## 📄 License

MIT
