'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BAND_COLORS, type Park } from '@/lib/ispark';
import type { LatLng } from '@/lib/geo';

const ISTANBUL: [number, number] = [28.9784, 41.0082];
const STYLE = 'https://tiles.openfreemap.org/styles/positron';

function toGeoJSON(parks: Park[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: parks.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        color: BAND_COLORS[p.band],
        label: p.isOpen && p.occupancy !== null ? String(p.available) : '?',
      },
    })),
  };
}

const emptyFC = (): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features: [] });

export default function MapView({
  parks,
  selectedId,
  onSelect,
  onUserLocation,
}: {
  parks: Park[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onUserLocation?: (c: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const parksRef = useRef<Park[]>(parks);
  const onSelectRef = useRef(onSelect);
  const onLocateRef = useRef(onUserLocation);
  const selectedIdRef = useRef(selectedId);
  parksRef.current = parks;
  onSelectRef.current = onSelect;
  onLocateRef.current = onUserLocation;
  selectedIdRef.current = selectedId;

  // Initialize the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: ISTANBUL,
      zoom: 10,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // MapLibre may init before flex layout settles (and only listens to window
    // resize), so observe the container and resize the map when it changes.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
    });
    map.addControl(geolocate, 'top-right');
    geolocate.on('geolocate', (e) => {
      const c = (e as GeolocationPosition).coords;
      onLocateRef.current?.({ lat: c.latitude, lng: c.longitude });
    });

    map.on('load', () => {
      loadedRef.current = true;

      map.addSource('parks', {
        type: 'geojson',
        data: toGeoJSON(parksRef.current),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 13,
      });
      map.addSource('selected', { type: 'geojson', data: emptyFC() });

      map.addLayer({
        id: 'selected-ring',
        type: 'circle',
        source: 'selected',
        paint: {
          'circle-radius': 20,
          'circle-color': 'rgba(37,99,235,0.12)',
          'circle-stroke-color': '#2563eb',
          'circle-stroke-width': 3,
        },
      });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'parks',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1e293b',
          'circle-opacity': 0.92,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 30, 25],
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'parks',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'parks',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 13,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'unclustered-label',
        type: 'symbol',
        source: 'parks',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });

      map.on('click', 'clusters', (e) => {
        const feature = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
        if (!feature) return;
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource('parks') as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      });

      map.on('click', 'unclustered', (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (id != null) onSelectRef.current(Number(id));
      });

      for (const layer of ['clusters', 'unclustered']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      // Draw any pre-selected lot now that layers exist.
      applySelection(map, parksRef.current, selectedIdRef.current);
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // Push fresh data into the source on every poll / filter change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('parks') as maplibregl.GeoJSONSource | undefined;
    source?.setData(toGeoJSON(parks));
  }, [parks]);

  // Fly to + highlight the selected lot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    applySelection(map, parksRef.current, selectedId);
  }, [selectedId]);

  // Inline position beats maplibre-gl.css's `.maplibregl-map { position: relative }`,
  // which would otherwise collapse the container to height 0.
  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );
}

function applySelection(map: maplibregl.Map, parks: Park[], selectedId: number | null) {
  const source = map.getSource('selected') as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  const park = selectedId != null ? parks.find((p) => p.id === selectedId) : undefined;
  if (!park) {
    source.setData(emptyFC());
    return;
  }
  source.setData({
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [park.lng, park.lat] }, properties: {} },
    ],
  });
  map.flyTo({ center: [park.lng, park.lat], zoom: Math.max(map.getZoom(), 15), speed: 1.2 });
}
