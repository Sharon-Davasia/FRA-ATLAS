import React, { useState } from 'react';
import { useUIStore } from '../utils/store';

export const LayerPanel: React.FC = () => {
  const layers = useUIStore(s => s.layers);
  const addLayer = useUIStore(s => s.addLayer);
  const removeLayer = useUIStore(s => s.removeLayer);
  const reorderLayers = useUIStore(s => s.reorderLayers);
  const toggleLayerVisibility = useUIStore(s => s.toggleLayerVisibility);
  const importGeoJSON = useUIStore(s => s.importGeoJSON);
  const [newLayerName, setNewLayerName] = useState('');
  const [open, setOpen] = useState(true);

  const handleAddLayer = () => {
    const name = newLayerName.trim() || undefined;
    addLayer({ name });
    setNewLayerName('');
  };

  const handleImportUrl = async () => {
    const url = prompt('Enter GeoJSON URL');
    if (!url) return;
    const res = await fetch(url);
    const fc = await res.json();
    importGeoJSON(fc, url.split('/').pop());
  };

  return (
    <div className={"card-panel"}>
      <div className="panel-header" onClick={()=>setOpen(o=>!o)} style={{ cursor:'pointer' }}>
        <strong className="panel-title">Layers</strong>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="btn" onClick={(e)=>{ e.stopPropagation(); handleImportUrl(); }}>+ From URL</button>
          <span style={{ color:'#2E7D32', fontWeight:600 }}>{open ? '▾' : '▸'}</span>
        </div>
      </div>
      <div className="panel-content" style={{ display: open ? 'block' : 'none' }}>
        <div className="row gap-8 mb-8">
          <input className="text-input flex-1" value={newLayerName} onChange={e=>setNewLayerName(e.target.value)} placeholder="New layer name" />
          <button className="btn accent" onClick={handleAddLayer}>Add</button>
        </div>

        <ul className="list-reset">
          {layers.map((layer, idx) => (
            <li key={layer.id} className="layer-item" draggable onDragStart={(e)=>{
              e.dataTransfer.setData('text/plain', String(idx));
              e.currentTarget.classList.add('dragging');
            }} onDragEnd={(e)=>e.currentTarget.classList.remove('dragging')} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{
              const from = Number(e.dataTransfer.getData('text/plain'));
              reorderLayers(from, idx);
            }}>
              <div className="layer-title">
                <input type="checkbox" checked={layer.visible} onChange={()=>toggleLayerVisibility(layer.id)} />
                <span>{layer.name}</span>
              </div>
              <div className="layer-actions">
                <button className="btn" onClick={()=>removeLayer(layer.id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};


