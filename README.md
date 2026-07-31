# Istanbul Parking Map 🅿️

A web app that shows Istanbul's car parks on a map with **live occupancy**, using
the Istanbul Metropolitan Municipality's open **İSPARK** data.

![İSPARK](https://img.shields.io/badge/İSPARK-live%20data-22c55e) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![MapLibre](https://img.shields.io/badge/MapLibre-GL-blue) ![Setup](https://img.shields.io/badge/setup-no%20API%20key%20needed-brightgreen)

---

## 🚀 Quick start

Clone, install, run:

```bash
git clone https://github.com/OlympicCode1/ISPARK-AI
cd ISPARK-AI
npm install
npm run build
npm run start
```

// or skip the build and use npm run dev to kickstart in development environment.


Then open **http://localhost:3000**. The map loads straight away with İSPARK's
live data.

**Requirement:** Node.js **18.17+** (or 20+). Check with `node -v`.

> [bonus traffic layer](#-bonus-nearby-live-traffic)

### Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Serves the built app |
| `npm run lint` | ESLint (see note below) |
| `npm run typecheck` | TypeScript type check |

> ⚠️ `npm run lint` has no ESLint config in the repo yet, so `next lint` drops into
> its interactive setup prompt on first run. `npm run build` and `npm run typecheck`
> are the checks that currently run unattended.

---

## 🔌 External services

Everything the app talks to is **remote and public** — there is no local service,
database, or seed data.

| Service | Used for | Key | Cost |
| --- | --- | --- | --- |
| İBB İSPARK API | Car park list + occupancy, details/tariff | ❌ Not needed | Free |
| OpenFreeMap | Base map (vector tiles + style) | ❌ Not needed | Free |
| Google Maps JS API | Bonus: nearby traffic | ✅ Optional | Free quota |

### Data source endpoints

The İBB İSPARK endpoints below need no authentication and are CORS-open:

| Endpoint | Description |
| --- | --- |
| `GET https://api.ibb.gov.tr/ispark/Park` | All car parks + capacity/free spaces |
| `GET https://api.ibb.gov.tr/ispark/ParkDetay?id=<id>` | Address, tariff, update time |

These are served through the Next.js routes under `app/api/parks` with ~30 s
caching (the data is normalized and the occupancy rate is computed there). The
browser talks to our own `/api/parks` endpoint, never directly to İSPARK.

If you want to verify the endpoints yourself after setup:

```bash
curl -s http://localhost:3000/api/parks | head -c 300
curl -s http://localhost:3000/api/parks/3068 | head -c 300
```

---

## 🚦 Bonus: nearby live traffic

// I tested with my own google maps api key and it is in the public repo pls do not abuse it. <3

Selecting a car park opens its detail panel, which includes a live traffic view of
the streets around it. It is **entirely optional** — without a key the app works in
full and a short hint appears instead of the traffic panel.

What the panel shows:

- A small Google map centred on the car park, with Google's **`TrafficLayer`**
  drawing current congestion on the surrounding roads (it refreshes itself).
- A **colour legend** for the traffic bands — free-flowing, moderate, heavy,
  stop-and-go.
- **Drive time in current traffic** from your location to the car park, plus
  whether the route is running slower than usual. This appears only once you have
  granted location permission (the 🧭 button on the main map) and requires the
  **Directions API**; if that API is not enabled, the panel quietly shows the map
  only.
- A **"Büyüt"** link that opens the same area in Google Maps' traffic view.

### Setup

1. In the [Google Cloud Console](https://console.cloud.google.com/), create an API
   key with **Maps JavaScript API** enabled. Optionally also enable the
   **Directions API** for the drive-time readout.
2. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```
3. Put your key in `.env.local` and restart `npm run dev`:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
   ```

> ⚠️ Variables prefixed with `NEXT_PUBLIC_` are embedded in the browser bundle.
> Restrict your key with an **HTTP referrer restriction** in the Google Cloud
> Console. `.env.local` is in `.gitignore`; do not commit your key.

Implementation: [components/TrafficMap.tsx](components/TrafficMap.tsx), rendered by
[components/ParkDetailPanel.tsx](components/ParkDetailPanel.tsx).

---

## ✨ Features

- 🗺️ **Live map** — ~250 İSPARK car parks, markers coloured by occupancy rate
  (MapLibre GL + OpenFreeMap, no API key).
- 🟢🟡🟠🔴 **Occupancy bands** — Available (0–49%), Filling (50–74%), Busy (75–89%),
  Full (90–100%), No data (closed).
- 🔄 **Auto refresh** — data is refreshed every 30 seconds.
- 🔍 **Search & filter** — search by name/district, hide car parks without data, sort.
- 🧭 **Navigation** — click a car park and the map flies to it; "Yol Tarifi Al" opens
  directions in Google Maps. With location permission, cards show **distance +
  bearing**.
- 🪧 **Car park card** — name, address, type, occupancy ring, free spaces, tariff,
  opening hours, last update.
- 🚦 **Bonus — nearby traffic** — live congestion around the selected car park plus
  drive time in traffic (Google Maps `TrafficLayer` + Directions).

---

## 🛠️ Tech

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · MapLibre GL ·
SWR · OpenFreeMap · @googlemaps/js-api-loader.

## 📁 Project structure

```
app/            Page, layout and the /api/parks routes
components/     MapView, Sidebar, ParkCard, ParkDetailPanel, OccupancyRing, TrafficMap …
lib/            ispark.ts (types + normalization), geo.ts (distance/bearing), useParks.ts (SWR)
```

Occupancy rate: `(capacity − free) / capacity × 100`. Closed car parks
(`isOpen == 0`) are shown in grey as "No data" and can be hidden with the filter.

---

## 🚢 Deployment

It is a standard Next.js app — it runs on Vercel, Netlify, Docker, or your own
server with `npm run build && npm run start`. **No environment variable is
required**; set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` only if you want the traffic
bonus.

## 🐛 Troubleshooting

| Symptom | Fix |
| --- | --- |
| "İSPARK verisi alınamadı" | The İBB endpoint may be temporarily down; try `curl https://api.ibb.gov.tr/ispark/Park`. Corporate networks/VPNs may block it. |
| Map is blank / grey | OpenFreeMap tiles may be blocked (network filter, ad blocker). |
| A hint shows instead of the traffic panel | Expected — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not set. |
| Added the key but no traffic appears | Restart the server; check that "Maps JavaScript API" is enabled in Google Cloud and that the referrer restriction is correct. The panel reports a rejected key inline. |
| Traffic map works but no drive time | Enable the **Directions API** on the key, and grant location permission with the 🧭 button on the map. |
| Build/type errors | Make sure you are on Node 18.17+, then `rm -rf node_modules .next && npm install`. |

## 🤝 Contributing

Issues and pull requests are welcome. Please make sure `npm run typecheck` and
`npm run build` pass before submitting.

## 📄 License

MIT — see [LICENSE](LICENSE).

Car park data belongs to the İBB Open Data Portal and is subject to its own terms
of use.
