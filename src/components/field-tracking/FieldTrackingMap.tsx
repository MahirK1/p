"use client";

import { useEffect, useRef, useCallback } from "react";
import "leaflet/dist/leaflet.css";

export type MapVisit = {
  id: string;
  clientName: string;
  scheduledAt: string;
  status: string;
  address: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Position = {
  latitude: number;
  longitude: number;
  name: string;
  speed: number | null;
  ignitionState: string | null;
  todayVisits?: MapVisit[];
  commercialId?: string;
};

function escapeHtml(s: string): string {
  if (typeof document === "undefined") return s;
  const el = document.createElement("div");
  el.textContent = s;
  return el.innerHTML;
}

type Props = {
  positions: Position[];
  selectedPosition: Position | null;
  onSelectPosition: (p: Position | null) => void;
  pathPoints?: Array<{ latitude: number; longitude: number }>;
};

export function FieldTrackingMap({ positions, selectedPosition, onSelectPosition, pathPoints = [] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pharmacyMarkersRef = useRef<any[]>([]);
  const pathLayerRef = useRef<any>(null);

  const addPharmacyMarkers = useCallback(
    (map: any, L: any, visits: MapVisit[]) => {
      pharmacyMarkersRef.current.forEach((m) => m.remove());
      pharmacyMarkersRef.current = [];

      const icon = L.divIcon({
        className: "pharmacy-marker",
        html: `<div style="width:20px;height:20px;background:#22c55e;border:2px solid white;border-radius:4px;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const points: [number, number][] = [];
      for (const v of visits) {
        const lat = v.latitude ?? null;
        const lng = v.longitude ?? null;
        if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
          const m = L.marker([lat, lng], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="min-width:160px;"><strong>${escapeHtml(v.clientName)}</strong><br/><span style="font-size:11px;color:#64748b;">${escapeHtml([v.address, v.city].filter(Boolean).join(", ") || "—")}</span></div>`
            );
          pharmacyMarkersRef.current.push(m);
          points.push([lat, lng]);
        }
      }
      return points;
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const L = require("leaflet");

    // Cleanup map when no positions (container may be unmounted)
    if (positions.length === 0) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore cleanup errors
        }
        mapInstanceRef.current = null;
      }
      return;
    }

    // Guard: container must exist and be in DOM before Leaflet touches it
    const container = mapRef.current;
    if (!container || !container.isConnected) return;

    if (!mapInstanceRef.current) {
      const center = positions[0];
      const map = L.map(container).setView(
        [center.latitude, center.longitude],
        positions.length === 1 ? 14 : 12
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const commercialIcon = L.divIcon({
      className: "field-tracking-marker",
      html: `<div style="width:24px;height:24px;background:#0ea5e9;border:2px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const selectedIcon = L.divIcon({
      className: "field-tracking-marker-selected",
      html: `<div style="width:28px;height:28px;background:#0284c7;border:3px solid #0ea5e9;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    for (const p of positions) {
      const isSelected = selectedPosition?.name === p.name;
      const m = L.marker([p.latitude, p.longitude], {
        icon: isSelected ? selectedIcon : commercialIcon,
      })
        .addTo(map)
        .on("click", () => {
          onSelectPosition(selectedPosition?.name === p.name ? null : p);
        });
      markersRef.current.push(m);
    }

    if (positions.length > 1 && !selectedPosition) {
      const bounds = L.latLngBounds(positions.map((p: Position) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [positions, selectedPosition, onSelectPosition]);

  // Cleanup map on unmount to avoid offsetWidth errors from orphaned Leaflet instance
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      pharmacyMarkersRef.current.forEach((m) => m.remove());
      pharmacyMarkersRef.current = [];
      if (pathLayerRef.current) {
        try {
          pathLayerRef.current.remove();
        } catch {
          // ignore
        }
        pathLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPosition) {
      pharmacyMarkersRef.current.forEach((m) => m.remove());
      pharmacyMarkersRef.current = [];
      if (pathLayerRef.current) {
        pathLayerRef.current.remove();
        pathLayerRef.current = null;
      }
      return;
    }

    const L = require("leaflet");
    const map = mapInstanceRef.current;
    const visits = selectedPosition.todayVisits ?? [];
    const points = addPharmacyMarkers(map, L, visits);

    if (pathLayerRef.current) {
      pathLayerRef.current.remove();
      pathLayerRef.current = null;
    }

    const pathCoords: [number, number][] = pathPoints
      .map((p) => [p.latitude, p.longitude] as [number, number])
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

    if (pathCoords.length > 1) {
      pathLayerRef.current = L.polyline(pathCoords, {
        color: "#0ea5e9",
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
    }

    const allPoints: [number, number][] = [
      [selectedPosition.latitude, selectedPosition.longitude],
      ...points,
      ...pathCoords,
    ];
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [selectedPosition, addPharmacyMarkers, pathPoints]);

  if (positions.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 md:h-[28rem]">
        Nema GPS pozicija za prikaz
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-96 w-full overflow-hidden rounded-xl border border-slate-200 md:h-[32rem] lg:h-[36rem]"
      style={{ minHeight: "400px" }}
    />
  );
}
