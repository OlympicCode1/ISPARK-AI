'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { LatLng } from '@/lib/geo';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    /** Called by the Maps JS API when it rejects the key. */
    gm_authFailure?: () => void;
  }
}

/** Dark base map so the traffic overlay matches the rest of the UI. */
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b5563' }] },
];

/** Colours Google paints on the traffic layer, from free-flowing to jammed. */
const TRAFFIC_LEGEND = [
  { color: '#4caf50', label: 'Akıcı' },
  { color: '#ffbb00', label: 'Orta' },
  { color: '#e53935', label: 'Yoğun' },
  { color: '#8b1a1a', label: 'Durma noktası' },
];

interface Eta {
  /** Duration in current traffic, e.g. "18 dk". */
  text: string;
  /** How much slower than free-flow, as a ratio (1 = no delay). */
  ratio: number | null;
  distance: string;
}

/** Null when Google returned no traffic-adjusted duration to compare against. */
function delayLabel(ratio: number | null): { text: string; color: string } | null {
  if (ratio === null) return null;
  if (ratio >= 1.4) return { text: 'Yolda yoğun trafik', color: '#ef4444' };
  if (ratio >= 1.15) return { text: 'Yolda orta yoğunluk', color: '#f97316' };
  return { text: 'Yol akıcı', color: '#22c55e' };
}

/**
 * BONUS: live traffic around the selected lot. Renders a small Google map with a
 * TrafficLayer, plus — when the browser has shared a location — the current
 * drive time to the lot including traffic delay.
 *
 * Only active when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set; otherwise it shows a
 * hint and the rest of the app works unchanged.
 */
export function TrafficMap({
  lat,
  lng,
  name,
  userCoords,
}: {
  lat: number;
  lng: number;
  name: string;
  userCoords: LatLng | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<Eta | null>(null);

  // The async load below finishes after mount, by which time the user may already
  // have picked another lot — read the current one through a ref, not the closure.
  const targetRef = useRef({ lat, lng, name });
  targetRef.current = { lat, lng, name };

  // Create the map once; later selections just pan it (see the effect below).
  useEffect(() => {
    if (!KEY || !containerRef.current) return;
    let cancelled = false;

    // Google calls this global when the key is rejected (invalid, restricted,
    // billing off) — the loader promise still resolves, so this is the only hook.
    window.gm_authFailure = () =>
      setError('Google API anahtarı reddedildi. Anahtarı, faturalandırmayı ve referrer kısıtlamalarını kontrol edin.');

    const loader = new Loader({ apiKey: KEY, version: 'weekly' });

    Promise.all([loader.importLibrary('maps'), loader.importLibrary('marker')])
      .then(([maps, marker]) => {
        if (cancelled || !containerRef.current) return;
        const target = targetRef.current;
        const center = { lat: target.lat, lng: target.lng };
        const map = new maps.Map(containerRef.current, {
          center,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          styles: DARK_STYLE,
        });
        mapRef.current = map;
        markerRef.current = new marker.Marker({ position: center, map, title: target.name });
        // Self-refreshing: the layer re-fetches tiles on its own every few minutes.
        new maps.TrafficLayer().setMap(map);
      })
      .catch(() =>
        setError('Google Haritalar yüklenemedi. API anahtarını ve "Maps JavaScript API" iznini kontrol edin.'),
      );

    return () => {
      cancelled = true;
      mapRef.current = null;
      markerRef.current = null;
      delete window.gm_authFailure;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selecting another lot pans the existing map instead of rebuilding it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat, lng });
    markerRef.current?.setPosition({ lat, lng });
    markerRef.current?.setTitle(name);
  }, [lat, lng, name]);

  // Drive time in current traffic. Needs the Directions API enabled on the key —
  // when it is not, we silently fall back to the map-only view.
  // Location tracking emits a new object on every GPS tick; keying on ~110 m
  // buckets keeps small jitter from spending a Directions request each time.
  const userKey = userCoords ? `${userCoords.lat.toFixed(3)},${userCoords.lng.toFixed(3)}` : null;
  const userRef = useRef(userCoords);
  userRef.current = userCoords;

  useEffect(() => {
    const origin = userRef.current;
    if (!KEY || !origin) {
      setEta(null);
      return;
    }
    let cancelled = false;
    setEta(null);

    new Loader({ apiKey: KEY, version: 'weekly' })
      .importLibrary('routes')
      .then(async (routes) => {
        const res = await new routes.DirectionsService().route({
          origin,
          destination: { lat, lng },
          travelMode: routes.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: routes.TrafficModel.BEST_GUESS,
          },
        });
        const leg = res.routes[0]?.legs[0];
        if (cancelled || !leg) return;
        const withTraffic = leg.duration_in_traffic ?? leg.duration;
        const freeFlow = leg.duration;
        setEta({
          text: withTraffic?.text ?? '—',
          ratio:
            leg.duration_in_traffic && freeFlow?.value
              ? leg.duration_in_traffic.value / freeFlow.value
              : null,
          distance: leg.distance?.text ?? '',
        });
      })
      .catch(() => {
        if (!cancelled) setEta(null);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, userKey]);

  if (!KEY) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 p-3 text-xs leading-relaxed text-white/50">
        <div className="mb-1 font-medium text-white/70">🚦 Çevre trafiği (bonus)</div>
        Canlı trafik yoğunluğunu görmek için bir Google Maps API anahtarı ekleyin:{' '}
        <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (
        <code className="rounded bg-white/10 px-1">.env.local</code>).
      </div>
    );
  }

  const delay = delayLabel(eta?.ratio ?? null);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-white/40">
          🚦 Çevre trafiği (canlı)
        </span>
        <a
          href={`https://www.google.com/maps/@${lat},${lng},15z/data=!5m1!1e1`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-white/40 underline decoration-dotted hover:text-white/70"
        >
          Büyüt
        </a>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div ref={containerRef} className="h-48 w-full overflow-hidden rounded-lg bg-white/5" />

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {TRAFFIC_LEGEND.map((t) => (
              <span key={t.label} className="flex items-center gap-1 text-[11px] text-white/45">
                <span className="h-1.5 w-4 rounded-full" style={{ background: t.color }} />
                {t.label}
              </span>
            ))}
          </div>

          {eta ? (
            <div className="mt-2 flex items-baseline justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span className="text-white/50">Şu anki trafikte</span>
              <span className="text-right">
                <span className="font-semibold text-white">{eta.text}</span>
                {eta.distance ? <span className="text-white/40"> · {eta.distance}</span> : null}
                {delay ? (
                  <span className="block text-[11px]" style={{ color: delay.color }}>
                    {delay.text}
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
