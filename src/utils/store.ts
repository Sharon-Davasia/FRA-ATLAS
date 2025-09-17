import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { produce } from 'immer';

export type GeometryType = 'Point' | 'LineString' | 'Polygon';

export interface FeatureProperties {
  [key: string]: unknown;
}

export interface FeatureItem {
  id: string;
  type: GeometryType;
  geometry: GeoJSON.Geometry;
  properties: FeatureProperties;
  layerId: string; // associated layer
}

export interface LayerItem {
  id: string;
  name: string;
  visible: boolean;
  style: Record<string, unknown>;
}

type ViewMode = 'map' | 'table';

interface ProjectState {
  layers: LayerItem[];
  features: FeatureItem[];
  selectedFeatureIds: string[];
}

interface UIState {
  viewMode: ViewMode;
  drawing: GeometryType | null;
  selectedRegion: FeatureProperties | null;
}

interface UndoEntry { state: ProjectState }

interface AppState extends ProjectState, UIState {
  // actions
  addLayer: (layer: Partial<LayerItem>) => string;
  removeLayer: (layerId: string) => void;
  reorderLayers: (from: number, to: number) => void;
  toggleLayerVisibility: (layerId: string) => void;
  updateLayerStyle: (layerId: string, style: Record<string, unknown>) => void;

  addFeature: (f: Omit<FeatureItem, 'id'>) => string;
  updateFeature: (id: string, updates: Partial<FeatureItem>) => void;
  removeFeature: (id: string) => void;
  selectFeatures: (ids: string[]) => void;

  setViewMode: (mode: ViewMode) => void;
  setDrawing: (g: GeometryType | null) => void;
  setSelectedRegion: (props: FeatureProperties | null) => void;

  // import/export
  exportGeoJSON: (layerId?: string) => GeoJSON.FeatureCollection;
  importGeoJSON: (fc: GeoJSON.FeatureCollection, layerName?: string) => string;

  // persistence
  saveProject: () => void;
  loadProject: () => void;

  // undo/redo
  undo: () => void;
  redo: () => void;
}

const STORAGE_KEY = 'fra-atlas-project-v1';

const initialState: ProjectState & UIState = {
  layers: [
    { id: 'default', name: 'My Features', visible: true, style: { color: '#55c2ff', weight: 2 } }
  ],
  features: [],
  selectedFeatureIds: [],
  viewMode: 'map',
  drawing: null,
  selectedRegion: null
};

const undoStack: UndoEntry[] = [];
const redoStack: UndoEntry[] = [];

const snapshot = (s: ProjectState) => JSON.parse(JSON.stringify(s)) as ProjectState;

export const useUIStore = create<AppState>()(devtools((set, get) => ({
  ...initialState,

  pushUndo() {
    const { layers, features, selectedFeatureIds } = get();
    undoStack.push({ state: snapshot({ layers, features, selectedFeatureIds }) });
    // clear redo on new action
    redoStack.length = 0;
  },

  addLayer(partial) {
    const id = crypto.randomUUID();
    const layer: LayerItem = { id, name: partial.name ?? `Layer ${id.slice(0,4)}` , visible: true, style: partial.style ?? {} };
    (get() as any).pushUndo();
    set(produce<AppState>(s => { s.layers.unshift(layer); }));
    return id;
  },
  removeLayer(layerId) {
    (get() as any).pushUndo();
    set(produce<AppState>(s => {
      s.layers = s.layers.filter(l => l.id !== layerId);
      s.features = s.features.filter(f => f.layerId !== layerId);
    }));
  },
  reorderLayers(from, to) {
    (get() as any).pushUndo();
    set(produce<AppState>(s => {
      const [moved] = s.layers.splice(from, 1);
      s.layers.splice(to, 0, moved);
    }));
  },
  toggleLayerVisibility(layerId) {
    set(produce<AppState>(s => {
      const layer = s.layers.find(l => l.id === layerId);
      if (layer) layer.visible = !layer.visible;
    }));
  },
  updateLayerStyle(layerId, style) {
    (get() as any).pushUndo();
    set(produce<AppState>(s => {
      const layer = s.layers.find(l => l.id === layerId);
      if (layer) layer.style = { ...layer.style, ...style };
    }));
  },

  addFeature(f) {
    const id = crypto.randomUUID();
    (get() as any).pushUndo();
    const feature: FeatureItem = { id, ...f };
    set(produce<AppState>(s => { s.features.push(feature); }));
    return id;
  },
  updateFeature(id, updates) {
    (get() as any).pushUndo();
    set(produce<AppState>(s => {
      const idx = s.features.findIndex(ff => ff.id === id);
      if (idx >= 0) s.features[idx] = { ...s.features[idx], ...updates };
    }));
  },
  removeFeature(id) {
    (get() as any).pushUndo();
    set(produce<AppState>(s => { s.features = s.features.filter(ff => ff.id !== id); }));
  },
  selectFeatures(ids) {
    set({ selectedFeatureIds: ids });
  },

  setViewMode(mode) { set({ viewMode: mode }); },
  setDrawing(g) { set({ drawing: g }); },
  setSelectedRegion(props) { set({ selectedRegion: props }); },

  exportGeoJSON(layerId) {
    const { features } = get();
    const selected = layerId ? features.filter(f => f.layerId === layerId) : features;
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: selected.map(f => ({ type: 'Feature', id: f.id, properties: f.properties, geometry: f.geometry }))
    };
    return fc;
  },
  importGeoJSON(fc, layerName) {
    const layerId = get().addLayer({ name: layerName ?? 'Imported' });
    (get() as any).pushUndo();
    set(produce<AppState>(s => {
      for (const feat of fc.features) {
        if (!feat.geometry) continue;
        const id = (typeof feat.id === 'string') ? feat.id : crypto.randomUUID();
        s.features.push({ id, type: feat.geometry.type as GeometryType, geometry: feat.geometry, properties: feat.properties ?? {}, layerId });
      }
    }));
    return layerId;
  },

  saveProject() {
    const { layers, features } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ layers, features }));
  },
  loadProject() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { layers: LayerItem[]; features: FeatureItem[] };
    set({ layers: parsed.layers, features: parsed.features });
  },

  undo() {
    const last = undoStack.pop();
    if (!last) return;
    const { layers, features, selectedFeatureIds } = last.state;
    const current: UndoEntry = { state: snapshot({ layers: get().layers, features: get().features, selectedFeatureIds: get().selectedFeatureIds }) };
    redoStack.push(current);
    set({ layers, features, selectedFeatureIds });
  },
  redo() {
    const next = redoStack.pop();
    if (!next) return;
    const current: UndoEntry = { state: snapshot({ layers: get().layers, features: get().features, selectedFeatureIds: get().selectedFeatureIds }) };
    undoStack.push(current);
    const { layers, features, selectedFeatureIds } = next.state;
    set({ layers, features, selectedFeatureIds });
  }
} as any)));


