import React, { useMemo } from 'react';
import { useUIStore } from '../utils/store';

export const DataTable: React.FC = () => {
  const features = useUIStore(s => s.features);
  const selected = useUIStore(s => s.selectedFeatureIds);
  const select = useUIStore(s => s.selectFeatures);

  const rows = features.map(f => ({ id: f.id, layerId: f.layerId, type: f.type, ...f.properties }));
  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
    return Array.from(keys);
  }, [features.length]);

  return (
    <div style={{ height:'100%', overflow:'auto' }}>
      <table className="table">
        <thead>
          <tr>
            {columns.map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ background: selected.includes(r.id) ? '#1a2535' : 'transparent', cursor:'pointer' }} onClick={()=>select([r.id])}>
              {columns.map(c => <td key={c}>{String((r as any)[c] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


