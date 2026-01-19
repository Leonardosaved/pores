import {create} from 'zustand';

interface ImageFile {
  filename: string;
  has_data: boolean;
}

interface ScaleBar {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Point {
  x: number;
  y: number;
}

interface ROI {
  id: number;
  points: Point[];
  areaPx2: number;
  areaUm2: number;
}

interface AppState {
  selectedFolder: string | null;
  images: ImageFile[];
  selectedImage: ImageFile | null;
  scaleBar: ScaleBar | null;
  scaleUm: number;
  isDrawing: boolean;
  currentRoiPoints: Point[];
  completedRois: ROI[];
  error: string | null;

  selectFolder: () => Promise<void>;
  fetchImages: () => Promise<void>;
  setSelectedImage: (image: ImageFile | null) => void;
  fetchScaleBar: (filename: string) => Promise<void>;
  setScaleBar: (bar: ScaleBar | null) => void;
  setScaleUm: (um: number) => void;
  toggleIsDrawing: () => void;
  addCurrentRoiPoint: (point: Point) => void;
  clearCurrentRoi: () => void;
  confirmCurrentRoi: () => Promise<void>;
}

const API_BASE_URL = 'http://localhost:8000';

export const useStore = create<AppState>((set, get) => ({
  selectedFolder: null,
  images: [],
  selectedImage: null,
  scaleBar: null,
  scaleUm: 0,
  isDrawing: false,
  currentRoiPoints: [],
  completedRois: [],
  error: null,

  selectFolder: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/select-folder`, { method: 'POST' });
      const data = await response.json();
      if (data.selected_folder) {
        set({ selectedFolder: data.selected_folder, error: null });
      } else {
        set({ error: 'Folder selection was cancelled.' });
      }
    } catch (err) {
      set({ error: 'Failed to select folder.' });
    }
  },

  fetchImages: async () => {
    const { selectedFolder } = get();
    if (!selectedFolder) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/images`);
      if (!response.ok) throw new Error('Failed to fetch images.');
      const data = await response.json();
      set({ images: data, error: null });
    } catch (err) {
      set({ error: 'Failed to fetch images.' });
    }
  },

  setSelectedImage: (image) => {
    set({ selectedImage: image, scaleBar: null, completedRois: [], currentRoiPoints: [], isDrawing: false });
    if (image) {
      get().fetchScaleBar(image.filename);
    }
  },

  fetchScaleBar: async (filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${filename}/scale-bar`);
      if (!response.ok) throw new Error('Scale bar not detected.');
      const data = await response.json();
      set({ scaleBar: data, error: null });
    } catch (err) {
      set({ scaleBar: null, error: 'Scale bar auto-detection failed. Please define it manually.' });
    }
  },

  setScaleBar: (bar) => {
    set({ scaleBar: bar });
  },

  setScaleUm: (um) => {
    set({ scaleUm: um });
  },

  toggleIsDrawing: () => {
    set((state) => ({ isDrawing: !state.isDrawing, currentRoiPoints: [] }));
  },

  addCurrentRoiPoint: (point) => {
    set((state) => ({
      currentRoiPoints: [...state.currentRoiPoints, point],
    }));
  },

  clearCurrentRoi: () => {
    set({ currentRoiPoints: [] });
  },

  confirmCurrentRoi: async () => {
    const { selectedImage, currentRoiPoints, scaleUm, completedRois, fetchImages } = get();
    if (!selectedImage || currentRoiPoints.length < 3) return;

    const scaleBar = get().scaleBar;
    const barPixelLength = scaleBar ? Math.sqrt((scaleBar.x2 - scaleBar.x1)**2 + (scaleBar.y2 - scaleBar.y1)**2) : 0;
    const pxPerUm = scaleUm > 0 ? barPixelLength / scaleUm : 0;

    let areaPx2 = 0;
    for (let i = 0; i < currentRoiPoints.length; i++) {
        const j = (i + 1) % currentRoiPoints.length;
        areaPx2 += currentRoiPoints[i].x * currentRoiPoints[j].y;
        areaPx2 -= currentRoiPoints[j].x * currentRoiPoints[i].y;
    }
    areaPx2 = Math.abs(areaPx2 / 2);
    const areaUm2 = pxPerUm > 0 ? areaPx2 / (pxPerUm * pxPerUm) : 0;

    const newRoiData = {
      selection_number: completedRois.length + 1,
      scale_px_per_um: pxPerUm,
      area_um2: areaUm2,
      area_px2: areaPx2,
      points: currentRoiPoints,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${selectedImage.filename}/roi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoiData),
      });

      if (!response.ok) throw new Error('Failed to save ROI.');

      set((state) => ({
        completedRois: [...state.completedRois, {
            id: newRoiData.selection_number,
            points: newRoiData.points,
            areaPx2: newRoiData.area_px2,
            areaUm2: newRoiData.area_um2,
        }],
        isDrawing: false,
        currentRoiPoints: [],
      }));

      fetchImages();

    } catch (err) {
      set({ error: 'Failed to save ROI data.' });
    }
  },
}));
