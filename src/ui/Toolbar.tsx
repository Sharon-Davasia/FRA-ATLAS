import React, { useRef } from 'react';
import { useUIStore } from '../utils/store';

export const Toolbar: React.FC = () => {
  const setViewMode = useUIStore(s => s.setViewMode);
  const viewMode = useUIStore(s => s.viewMode);
  const setDrawing = useUIStore(s => s.setDrawing);
  const drawing = useUIStore(s => s.drawing);
  const undo = useUIStore(s => s.undo);
  const redo = useUIStore(s => s.redo);
  const exportGeoJSON = useUIStore(s => s.exportGeoJSON);
  const importGeoJSON = useUIStore(s => s.importGeoJSON);
  const saveProject = useUIStore(s => s.saveProject);
  const loadProject = useUIStore(s => s.loadProject);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const fc = exportGeoJSON();
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'map-data.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const fc = JSON.parse(text) as GeoJSON.FeatureCollection;
    importGeoJSON(fc, file.name.replace(/\.geojson$/i,'').slice(0,40));
    e.target.value = '';
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Map toolbar">
      <div className="seg" role="group" aria-label="Mode">
        <button className={viewMode==='map'? 'active':''} onClick={()=>setViewMode('map')}>Map</button>
        <button className={viewMode==='table'? 'active':''} onClick={()=>setViewMode('table')}>Table</button>
      </div>

      <div className="seg" role="group" aria-label="Draw">
        <button className={drawing==='Point'? 'active':''} onClick={()=>setDrawing(drawing==='Point'? null : 'Point')}>Point</button>
        <button className={drawing==='LineString'? 'active':''} onClick={()=>setDrawing(drawing==='LineString'? null : 'LineString')}>Line</button>
        <button className={drawing==='Polygon'? 'active':''} onClick={()=>setDrawing(drawing==='Polygon'? null : 'Polygon')}>Polygon</button>
      </div>

      <button className="btn" onClick={undo}>Undo</button>
      <button className="btn" onClick={redo}>Redo</button>

      <div className="spacer" />

      <button className="btn" onClick={()=>fileRef.current?.click()}>Import GeoJSON</button>
      <input ref={fileRef} type="file" accept=".json,.geojson,application/geo+json" style={{ display:'none' }} onChange={handleImport} />
      <button className="btn" onClick={handleExport}>Export GeoJSON</button>
      <button className="btn" onClick={saveProject}>Save Project</button>
      <button className="btn" onClick={loadProject}>Load Project</button>
    </div>
  );
};


