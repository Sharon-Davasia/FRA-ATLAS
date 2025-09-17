import React from 'react';
import { useUIStore } from '../utils/store';

export const Sidebar: React.FC = () => {
  const region = useUIStore(s => s.selectedRegion);
  return (
    <aside style={{ width: 320, maxWidth: '32vw', background:'#0f141b', borderLeft:'1px solid var(--border)', height:'100%', padding:12, overflow:'auto' }}>
      {!region ? (
        <div style={{ color:'var(--muted)' }}>Hover or click a region to see details</div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          <h3 style={{ margin:'4px 0 8px' }}>{String(region.name ?? 'Region')}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', rowGap:6 }}>
            <span style={{ color:'var(--muted)' }}>Claims</span>
            <strong>{String(region.claims ?? '-')}</strong>
            <span style={{ color:'var(--muted)' }}>Titles</span>
            <strong>{String(region.titles ?? '-')}</strong>
            <span style={{ color:'var(--muted)' }}>Trees</span>
            <strong>{String(region.trees ?? '-')}</strong>
          </div>
        </div>
      )}
    </aside>
  );
};


