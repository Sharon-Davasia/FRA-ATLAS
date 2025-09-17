import React from 'react';
import { useUIStore } from '../utils/store';

export const BuilderPanel: React.FC = () => {
  const layers = useUIStore(s => s.layers);
  const updateLayerStyle = useUIStore(s => s.updateLayerStyle);

  return (
    <>
      <div className="panel-header">
        <strong>Builder</strong>
        <span style={{ color:'var(--muted)' }}>Styles & Symbology</span>
      </div>
      <div className="panel-content">
        {layers.map(layer => (
          <div key={layer.id} style={{ border:'1px solid var(--border)', borderRadius:8, padding:10, marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <strong>{layer.name}</strong>
              <span style={{ color:'var(--muted)' }}>#{layer.id.slice(0,6)}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <label style={{ display:'grid', gap:6 }}>
                <span>Stroke color</span>
                <input type="color" value={(layer.style.color as string) || '#55c2ff'} onChange={e=>updateLayerStyle(layer.id, { color: e.target.value })} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span>Fill color</span>
                <input type="color" value={(layer.style.fillColor as string) || '#55c2ff33'} onChange={e=>updateLayerStyle(layer.id, { fillColor: e.target.value })} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span>Weight</span>
                <input type="range" min={1} max={8} value={(layer.style.weight as number) ?? 2} onChange={e=>updateLayerStyle(layer.id, { weight: Number(e.target.value) })} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span>Opacity</span>
                <input type="range" min={0} max={1} step={0.05} value={(layer.style.opacity as number) ?? 1} onChange={e=>updateLayerStyle(layer.id, { opacity: Number(e.target.value) })} />
              </label>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};


