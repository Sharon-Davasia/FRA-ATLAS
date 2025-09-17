import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import districts from '../data/districts_sample.json';
import villages from '../data/villages_sample.json';

type DistrictFeature = {
  type: 'Feature';
  properties: { district_name?: string; district_code?: string; state?: string; [k: string]: unknown };
  geometry: GeoJSON.Geometry;
};

type VillageFeature = {
  type: 'Feature';
  properties: { name?: string; district_code?: string; [k: string]: unknown };
  geometry: GeoJSON.Geometry;
};

type Suggestion = {
  kind: 'district' | 'village';
  label: string;
  subLabel: string;
  feature: DistrictFeature | VillageFeature;
};

export const SearchBar: React.FC = () => {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const highlightRef = useRef<L.Layer | null>(null);
  const clearTimer = useRef<number | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const districtCodeToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of (districts as any).features as DistrictFeature[]) {
      const code = String(f.properties.district_code ?? '');
      const name = String(f.properties.district_name ?? '');
      if (code) m.set(code, name);
    }
    return m;
  }, []);

  const index = useMemo(() => {
    const items: Suggestion[] = [];
    for (const f of (districts as any).features as DistrictFeature[]) {
      const name = String(f.properties.district_name ?? '').trim();
      const state = String(f.properties.state ?? '').trim();
      if (!name) continue;
      items.push({ kind: 'district', label: name, subLabel: state, feature: f });
    }
    for (const f of (villages as any).features as VillageFeature[]) {
      const name = String(f.properties.name ?? '').trim();
      const dcode = String(f.properties.district_code ?? '').trim();
      if (!name) continue;
      const dname = districtCodeToName.get(dcode) || dcode || '';
      items.push({ kind: 'village', label: name, subLabel: dname, feature: f });
    }
    return items;
  }, [districtCodeToName]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setSuggestions([]); setOpen(false); return; }
    const filtered = index
      .filter(it => it.label.toLowerCase().includes(q) || it.subLabel.toLowerCase().includes(q))
      .slice(0, 6);
    setSuggestions(filtered);
    setOpen(filtered.length > 0);
  }, [query, index]);

  const clearHighlight = () => {
    if (clearTimer.current) { window.clearTimeout(clearTimer.current); clearTimer.current = null; }
    if (highlightRef.current) { map.removeLayer(highlightRef.current); highlightRef.current = null; }
  };

  const handlePick = (s: Suggestion) => {
    setQuery(`${s.label}`);
    setOpen(false);
    clearHighlight();

    // Fit/center
    const g = s.feature.geometry;
    if (g.type === 'Point') {
      const [lng, lat] = (g.coordinates as number[]);
      map.setView([lat, lng], Math.max(map.getZoom(), 12));
      const marker = L.circleMarker([lat, lng], { radius: 10, color: '#ffcc00', weight: 3, opacity: 1, fillColor: '#ffcc00', fillOpacity: 0.5 });
      marker.addTo(map);
      marker.bindPopup(`<b>${s.kind === 'district' ? 'District' : 'Village'}:</b> ${s.label}${s.subLabel ? ` — ${s.subLabel}` : ''}`);
      marker.openPopup();
      highlightRef.current = marker;
    } else {
      const layer = L.geoJSON(s.feature as any, {
        style: { color: '#ffcc00', weight: 5, opacity: 1, fillOpacity: 0.1 },
        pointToLayer: (feat, latlng) => L.circleMarker(latlng, { radius: 10, color: '#ffcc00', weight: 3, opacity: 1, fillColor: '#ffcc00', fillOpacity: 0.5 })
      });
      layer.addTo(map);
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b.pad(0.2));
      const center = b.isValid() ? b.getCenter() : (map.getCenter());
      (layer as any).bindPopup(`<b>${s.kind === 'district' ? 'District' : 'Village'}:</b> ${s.label}${s.subLabel ? ` — ${s.subLabel}` : ''}`);
      (layer as any).openPopup(center);
      highlightRef.current = layer;
    }

    clearTimer.current = window.setTimeout(() => { clearHighlight(); }, 6000);
  };

  useEffect(() => () => { clearHighlight(); }, []);

  return (
    <div
      ref={dragRef}
      className="search-control"
      onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); } }}
      onMouseDown={(e) => {
        const el = dragRef.current; if (!el) return;
        const startX = e.clientX; const startY = e.clientY;
        const startLeft = el.offsetLeft; const startTop = el.offsetTop;
        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX; const dy = ev.clientY - startY;
          el.style.left = 'auto';
          el.style.right = `${Math.max(10, (window.innerWidth - (startLeft + dx) - el.offsetWidth))}px`;
          el.style.top = `${Math.max(10, startTop + dy)}px`;
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
    >
      <input
        className="search-input"
        placeholder="Search districts or villages..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
      />
      {open && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map((s, idx) => (
            <div key={idx} className="search-suggestion" onMouseDown={(e) => e.preventDefault()} onClick={() => handlePick(s)}>
              <span className="kind">{s.kind === 'district' ? 'District' : 'Village'}:</span>
              <span className="label">{s.label}</span>
              {s.subLabel ? <span className="sublabel"> — {s.subLabel}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


