import React from 'react';
import { MapCanvas } from './MapCanvas';
import { LayerPanel } from './LayerPanel';
import { Toolbar } from './Toolbar';
import { DataTable } from './DataTable';
import { BuilderPanel } from './BuilderPanel';
import { useUIStore } from '../utils/store';

export const App: React.FC = () => {
  const viewMode = useUIStore(s => s.viewMode);
  return (
    <div className={`app-shell ${viewMode==='map' ? 'view-map' : 'view-table'}`}>
      <div className="app-toolbar">
        <Toolbar />
      </div>
      <aside className="left-panel">
        <LayerPanel />
        <BuilderPanel />
      </aside>
      <main className="main-area">
        <div className="map-container">
          <MapCanvas />
        </div>
        <div className="table-container">
          <DataTable />
        </div>
      </main>
    </div>
  );
};


