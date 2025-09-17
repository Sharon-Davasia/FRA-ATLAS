import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap, GeoJSON } from 'react-leaflet';
import L, { LeafletMouseEvent, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useUIStore } from '../utils/store';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import districtsMpGeojson from '../data/districtsMp.json';
import districtsSample from "../data/districts_sample.json";
import citiesSample from "../data/cities_sample.json";
import villagesSample from "../data/villages_sample.json";

import { SearchBar } from './SearchBar';



const getStyle = (color: string) => ({
  fillColor: color,
  weight: 2,
  opacity: 1,
  color: "white",
  fillOpacity: 0.7,
});



const DEFAULT_CENTER: LatLngExpression = [20, 0];
const DEFAULT_ZOOM = 2;

const ResetControl: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const ctrl = new L.Control({ position: 'topleft' });
    (ctrl as any).onAdd = () => {
      const btn = L.DomUtil.create('button', 'btn');
      btn.innerText = 'Reset';
      btn.style.margin = '6px';
      btn.onclick = () => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return btn;
    };
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map]);
  return null;
};

const PrintControl: React.FC<{ rootRef: React.RefObject<HTMLDivElement> }> = ({ rootRef }) => {
  const map = useMap();
  useEffect(() => {
    const ctrl = new L.Control({ position: 'topleft' });
    (ctrl as any).onAdd = () => {
      const container = L.DomUtil.create('div');
      container.style.display = 'flex';
      container.style.gap = '6px';
      const imgBtn = L.DomUtil.create('button', 'btn', container);
      imgBtn.innerText = 'Export PNG';
      imgBtn.style.margin = '6px 0 6px 6px';
      imgBtn.onclick = async () => {
        const node = rootRef.current; if (!node) return;
        const dataUrl = await toPng(node, { pixelRatio: 2 });
        const a = document.createElement('a'); a.href = dataUrl; a.download = 'map.png'; a.click();
      };
      const pdfBtn = L.DomUtil.create('button', 'btn', container);
      pdfBtn.innerText = 'Export PDF';
      pdfBtn.style.margin = '6px 6px 6px 0';
      pdfBtn.onclick = async () => {
        const node = rootRef.current; if (!node) return;
        const dataUrl = await toPng(node, { pixelRatio: 2 });
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [node.clientWidth, node.clientHeight] });
        pdf.addImage(dataUrl, 'PNG', 0, 0, node.clientWidth, node.clientHeight);
        pdf.save('map.pdf');
      };
      return container;
    };
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map, rootRef]);
  return null;
};

export const MapCanvas: React.FC = () => {
  const layers = useUIStore(s => s.layers);
  const features = useUIStore(s => s.features);
  const drawing = useUIStore(s => s.drawing);
  const addFeature = useUIStore(s => s.addFeature);
  const select = useUIStore(s => s.selectFeatures);
  const selected = useUIStore(s => s.selectedFeatureIds);
  const layerStyles = useMemo(() => Object.fromEntries(layers.map(l => [l.id, l.style])), [layers]);

  const mapRef = useRef<L.Map | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties || {};

    // Build tooltip content dynamically from all properties (except internal keys)
    const entries = Object.entries(props).filter(([key]) => !key.startsWith("__"));
    const rows = entries
      .map(([key, value]) => {
        let display: string;
        if (value === null || value === undefined) {
          display = "N/A";
        } else if (typeof value === "object") {
          try {
            display = JSON.stringify(value);
          } catch {
            display = String(value);
          }
        } else {
          display = String(value);
        }
        return `<tr><td style="font-weight:600;padding:2px 6px;vertical-align:top;white-space:nowrap;">${key}</td><td style="padding:2px 6px;">${display}</td></tr>`;
      })
      .join("");

    const content = rows ? `<div style=\"max-width:100%;\"><table>${rows}</table></div>` : "<i>No properties</i>";

    // Use a Popup so the map auto-pans to keep it visible
    if ((layer as any).bindPopup) {
      (layer as any).bindPopup(content, {
        autoPan: true,
        autoPanPadding: [20, 20],
        maxWidth: 800,
        className: 'feature-popup'
      });
      layer.on('mouseover', () => (layer as any).openPopup());
      layer.on('mouseout', () => (layer as any).closePopup());
      // Also open on click for touch users
      layer.on('click', () => (layer as any).openPopup());
    }

    // Extra interactions
    layer.on("click", () => select([feature.id]));
    layer.on("contextmenu", () => {
      const note = prompt("Add/Edit annotation", (props as any).__note || "");
      if (note != null) {
        feature.properties = { ...props, __note: note };
      }
    });
  };
  

  const styleFn = (feat: any) => {
    const style = layerStyles[feat.properties.__layerId as string] || {};
    return {
      color: style.color as string || '#55c2ff',
      weight: style.weight as number || 2,
      opacity: style.opacity as number || 1,
      fillColor: style.fillColor as string || '#55c2ff55',
      fillOpacity: 0.5
    } as L.PathOptions;
  };

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      id: f.id,
      properties: { ...f.properties, __layerId: f.layerId },
      geometry: f.geometry
    }))
  }), [features]);

  const DrawingTools: React.FC = () => {
    const map = useMap();
  
    useEffect(() => {
      if (!map) return;
      // @ts-ignore
      map.pm?.addControls({
        position: 'topleft',
        drawCircle: false,
        drawCircleMarker: false,
        drawMarker: false,
        drawText: false,
      });
  
      // reset tools
      // @ts-ignore
      map.pm?.disableDraw();
      if (drawing === 'Point') {
        // @ts-ignore
        map.pm?.enableDraw('Marker');
      } else if (drawing === 'LineString') {
        // @ts-ignore
        map.pm?.enableDraw('Line');
      } else if (drawing === 'Polygon') {
        // @ts-ignore
        map.pm?.enableDraw('Polygon');
      }
    }, [map, drawing]);
  
    useEffect(() => {
      if (!map) return;
      const handleCreate = (e: any) => {
        const layer = e.layer as L.Layer;
        let geometry: GeoJSON.Geometry | null = null;
        if ((layer as any).toGeoJSON) {
          const gj = (layer as any).toGeoJSON();
          geometry = gj.geometry as GeoJSON.Geometry;
        }
        if (geometry) {
          const firstLayer = layers[0]?.id ?? 'default';
          addFeature({
            type: geometry.type as any,
            geometry,
            properties: {},
            layerId: firstLayer,
          });
        }
        map.removeLayer(layer);
      };
      // @ts-ignore
      map.on('pm:create', handleCreate);
      return () => {
        // @ts-ignore
        map.off('pm:create', handleCreate);
      };
    }, [map, layers, addFeature]);
  
    return null;
  };
  

  const SelectedOutline: React.FC = () => {
    const sel = new Set(selected);
    const selectedFeatures = features.filter(f => sel.has(f.id));
    if (selectedFeatures.length === 0) return null;
    return (
      <GeoJSON data={{ type:'FeatureCollection', features: selectedFeatures.map(f => ({ type:'Feature', id:f.id, properties:f.properties, geometry:f.geometry })) } as any} style={()=>({ color:'#8a7dff', weight: 4 })} />
    );
  };

  return (
    <div ref={rootRef} className="map-canvas">
      <MapContainer
  center={DEFAULT_CENTER}
  zoom={DEFAULT_ZOOM}
  style={{ height: "100%", width: "100%" }}
>
  {/* Floating search control */}
  <SearchBar />
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
  />

  {/* Original MP Districts */}
  <GeoJSON
    data={districtsMpGeojson as any}
    style={styleFn}
    onEachFeature={onEachFeature}
  />

  {/* Districts (Sample) */}
  <GeoJSON
    data={districtsSample as any}
    style={() => getStyle("#4CAF50")}
    onEachFeature={onEachFeature}
  />

  {/* Cities */}
  <GeoJSON
    data={citiesSample as any}
    style={() => getStyle("#2196F3")}
    onEachFeature={onEachFeature}
  />

  {/* TRIPURA.json
<GeoJSON
    data={tripurajson as any}
    style={styleFn}
    onEachFeature={onEachFeature}
  /> */}

  {/* Villages */}
  <GeoJSON
    data={villagesSample as any}
    style={() => getStyle("#FF9800")}
    onEachFeature={onEachFeature}
  />

  <ResetControl />
  <PrintControl rootRef={rootRef} />
  <DrawingTools />
  <SelectedOutline />
</MapContainer>

    </div>
  );
};


