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
  version: number;
  points: Point[];
  areaPx2: number;
  areaUm2: number;
  notes?: string;
  isModifying?: boolean;
}

interface AppState {
  selectedFolder: string | null;
  images: ImageFile[];
  selectedImage: ImageFile | null;
  scaleBar: ScaleBar | null;
  scaleUm: number;
  lastScaleBar: ScaleBar | null;
  lastScaleUm: number;
  isDrawing: boolean;
  currentRoiPoints: Point[];
  completedRois: ROI[];
  error: string | null;
  modifyingRoiId: number | null;
  pendingRoiNotes: Record<number, string>;
  roiNotesSaved: Record<number, string>;
  stageWidth: number;
  scaleBarDetected: Record<string, boolean>; // Track if scale bar was auto-detected per image
  saveFailedRoiNoteIds: Set<number>; // Track which notes failed to save

  selectFolder: () => Promise<void>;
  fetchImages: () => Promise<void>;
  setSelectedImage: (image: ImageFile | null) => void;
  fetchScaleBar: (filename: string) => Promise<void>;
  loadSavedAnalysis: (filename: string) => Promise<void>;
  setScaleBar: (bar: ScaleBar | null) => void;
  setScaleUm: (um: number) => void;
  setStageWidth: (width: number) => void;
  toggleIsDrawing: () => void;
  addCurrentRoiPoint: (point: Point) => void;
  clearCurrentRoi: () => void;
  confirmCurrentRoi: () => Promise<void>;
  startModifyingRoi: (roiId: number) => void;
  cancelModifyingRoi: () => void;
  deleteAnalysis: (filename: string) => Promise<void>;
  updateRoiNotesLocal: (roiId: number, notes: string) => void;
  saveRoiNotes: (roiId: number, notes: string, retry?: boolean) => Promise<void>;
  flushPendingRoiNotes: () => Promise<void>;
}

const API_BASE_URL = 'http://localhost:8000';

export const useStore = create<AppState>((set, get) => ({
  selectedFolder: null,
  images: [],
  selectedImage: null,
  scaleBar: null,
  scaleUm: 0,
  lastScaleBar: null,
  lastScaleUm: 0,
  isDrawing: false,
  currentRoiPoints: [],
  completedRois: [],
  error: null,
  modifyingRoiId: null,
  pendingRoiNotes: {},
  roiNotesSaved: {},
  stageWidth: 0,
  scaleBarDetected: {},
  saveFailedRoiNoteIds: new Set(),

  selectFolder: async () => {
    try {
      // Use the File System Access API for folder selection
      const dirHandle = await (window as any).showDirectoryPicker();
      const folderName = dirHandle.name;
      
      // Ask for the full path just once
      const fullPath = prompt(
        `Folder selected: "${folderName}"\n\nEnter the full path to this folder:\n\nExample: C:\\Users\\YourName\\Pictures\\Microscopy`,
        ''
      );
      
      if (!fullPath || !fullPath.trim()) {
        set({ error: 'Folder selection was cancelled.' });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/select-folder`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: fullPath })
      });
      const data = await response.json();
      if (!response.ok) {
        set({ error: data.detail || 'Invalid folder path.' });
        return;
      }
      if (data.selected_folder) {
        set({ selectedFolder: data.selected_folder, error: null });
      } else {
        set({ error: 'Folder selection failed.' });
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled the folder picker - fallback to text input
        const folderPath = prompt('Enter the path to your TIFF images folder:\n\nExample: C:\\Users\\YourName\\Pictures\\Microscopy');
        if (!folderPath) {
          set({ error: 'Folder selection was cancelled.' });
          return;
        }
        try {
          const response = await fetch(`${API_BASE_URL}/api/select-folder`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_path: folderPath })
          });
          const data = await response.json();
          if (!response.ok) {
            set({ error: data.detail || 'Invalid folder path.' });
            return;
          }
          if (data.selected_folder) {
            set({ selectedFolder: data.selected_folder, error: null });
          }
        } catch {
          set({ error: 'Failed to select folder.' });
        }
      } else {
        set({ error: 'Failed to select folder. Please try again.' });
      }
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
    // Clear state and set new image first
    set({ 
      selectedImage: image, 
      // Don't clear scaleBar here - let loadSavedAnalysis restore it
      // scaleBar: null,  
      completedRois: [], 
      currentRoiPoints: [], 
      isDrawing: false, 
      modifyingRoiId: null, 
      pendingRoiNotes: {}
    });
    
    // Then load saved analysis (which will populate scaleBar if found)
    if (image) {
      get().loadSavedAnalysis(image.filename);
    }
  },

  loadSavedAnalysis: async (filename) => {
    const currentState = get();
    // Only load if this is still the selected image
    if (currentState.selectedImage?.filename !== filename) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${filename}/analysis`);
      if (response.ok) {
        const data = await response.json();
        
        // Verify we still have the same image selected
        if (get().selectedImage?.filename !== filename) return;
        
        const savedNotes = (data.rois || []).reduce((acc: Record<number, string>, roi: ROI) => {
          acc[roi.id] = roi.notes ?? "";
          return acc;
        }, {});
        
        // Check if we actually got valid ROI data
        if (data.rois && data.rois.length > 0) {
          // Validate scale value
          const validScaleUm = data.scaleUm ? Math.max(1, Math.min(10000, data.scaleUm)) : 100;
          set({
            scaleBar: data.scaleBar || get().scaleBar,  // Preserve existing scale bar if not found
            scaleUm: validScaleUm,
            completedRois: data.rois,
            pendingRoiNotes: {},
            roiNotesSaved: savedNotes,
            scaleBarDetected: { ...get().scaleBarDetected, [filename]: true }
          });
          
          // If scale bar was found, save it as the last scalebar for future images
          if (data.scaleBar && data.scaleUm > 0) {
            set({ lastScaleBar: data.scaleBar, lastScaleUm: data.scaleUm });
          }
          return;
        }
        
        // No ROIs but maybe scale bar data
        if (data.scaleBar && data.scaleUm > 0) {
          // Validate scale value
          const validScaleUm = Math.max(1, Math.min(10000, data.scaleUm));
          set({
            scaleBar: data.scaleBar || get().scaleBar,  // Use loaded or existing
            scaleUm: validScaleUm,
            lastScaleBar: data.scaleBar,
            lastScaleUm: validScaleUm,
            scaleBarDetected: { ...get().scaleBarDetected, [filename]: true }
          });
          return;
        }
      }
    } catch (err) {
      console.log('No saved analysis for this image');
    }
    
    // No saved data found, try auto-detection
    const detected = get().scaleBarDetected[filename];
    if (!detected) {
      get().fetchScaleBar(filename);
    }
  },

  fetchScaleBar: async (filename) => {
    // Verify this is still the selected image
    if (get().selectedImage?.filename !== filename) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${filename}/scale-bar`);
      if (!response.ok) throw new Error('Scale bar not detected.');
      const data = await response.json();
      
      // Verify still the selected image after async call
      if (get().selectedImage?.filename !== filename) return;
      
      if (!data || data.x1 === undefined || data.x2 === undefined) {
        throw new Error('Invalid scale bar data');
      }
      
      // Set default scale value to 100µm (your standard scale bar)
      const defaultScaleUm = 100;
      // Validate the scale bar coordinates
      const validScaleBar = {
        x1: Math.max(0, Math.min(10000, data.x1 || 0)),
        y1: Math.max(0, Math.min(10000, data.y1 || 0)),
        x2: Math.max(0, Math.min(10000, data.x2 || 0)),
        y2: Math.max(0, Math.min(10000, data.y2 || 0))
      };
      set({ 
        scaleBar: validScaleBar, 
        scaleUm: defaultScaleUm, 
        lastScaleBar: validScaleBar, 
        lastScaleUm: defaultScaleUm, 
        error: null,
        scaleBarDetected: { ...get().scaleBarDetected, [filename]: true }
      });
      
      // Show notification that scale bar was auto-detected
      set({ error: 'Scale bar auto-detected (100µm). Adjust if needed.' });
      setTimeout(() => {
        if (get().error === 'Scale bar auto-detected (100µm). Adjust if needed.') {
          set({ error: null });
        }
      }, 4000);
      
      // Auto-save the detected scale bar
      fetch(`${API_BASE_URL}/api/images/${filename}/scale-bar-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scaleBar: data, scaleUm: defaultScaleUm })
      }).catch(err => console.log('Could not save scale bar:', err));
    } catch (err) {
      console.log('Scale bar detection failed:', err);
      const { lastScaleBar, lastScaleUm } = get();
      // If detection fails and we have a previous scalebar, use it
      if (lastScaleBar && lastScaleUm > 0) {
        set({ scaleBar: lastScaleBar, scaleUm: lastScaleUm, error: null });
      } else {
        set({ error: 'Scale bar not found. Please define it manually.' });
      }
      // Mark as detected to avoid re-trying
      set({ scaleBarDetected: { ...get().scaleBarDetected, [filename]: true } });
    }
  },

  setScaleBar: (bar) => {
    const { selectedImage } = get();
    set({ scaleBar: bar });
    // Save as last scalebar when manually set
    if (bar) {
      set({ lastScaleBar: bar });
    }
    // Save scale bar config when it changes
    if (selectedImage && bar) {
      fetch(`${API_BASE_URL}/api/images/${selectedImage.filename}/scale-bar-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scaleBar: bar, scaleUm: get().scaleUm })
      }).catch(err => console.log('Could not save scale bar config:', err));
    }
  },

  setScaleUm: (um) => {
    const { selectedImage, scaleBar } = get();
    // Validate scale value is reasonable (between 1 and 10000 µm)
    const validUm = Math.max(1, Math.min(10000, um));
    set({ scaleUm: validUm });
    // Save scale bar config when scale value changes
    if (selectedImage && scaleBar) {
      fetch(`${API_BASE_URL}/api/images/${selectedImage.filename}/scale-bar-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scaleBar: scaleBar, scaleUm: validUm })
      }).catch(err => console.log('Could not save scale bar config:', err));
    }
  },

  setStageWidth: (width) => {
    set({ stageWidth: width });
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
    const { selectedImage, currentRoiPoints, scaleUm, completedRois, fetchImages, modifyingRoiId, pendingRoiNotes } = get();
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

    // Determine if modifying existing ROI or creating new one
    // Use max ID + 1 instead of length to handle deleted ROIs correctly
    let roiId = Math.max(...completedRois.map(r => r.id), 0) + 1;
    let version = 1;
    
    let existingNotes = "";
    if (modifyingRoiId !== null) {
      const existingRoi = completedRois.find(r => r.id === modifyingRoiId);
      if (existingRoi) {
        roiId = existingRoi.id;
        version = existingRoi.version + 1; // Increment version for geometry modification
        existingNotes = pendingRoiNotes[roiId] ?? existingRoi.notes ?? "";
      }
    }

    const newRoiData = {
      selection_number: roiId,
      version: version,
      scale_px_per_um: pxPerUm,
      scale_bar: scaleBar,
      scale_um: scaleUm,
      area_um2: areaUm2,
      area_px2: areaPx2,
      points: currentRoiPoints,
      is_modification: modifyingRoiId !== null,
      notes: existingNotes,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${selectedImage.filename}/roi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoiData),
      });

      if (!response.ok) throw new Error('Failed to save ROI.');

      // If modifying, update existing ROI; if new, add to list
      const updatedRois = modifyingRoiId !== null
        ? completedRois.map(r => r.id === modifyingRoiId 
          ? { ...r, points: currentRoiPoints, areaPx2, areaUm2, version, notes: existingNotes }
          : r)
        : [...completedRois, {
            id: roiId,
            version: 1,
            points: currentRoiPoints,
            areaPx2,
            areaUm2,
            notes: existingNotes,
          }];

      set((state) => {
        const nextPending = { ...state.pendingRoiNotes };
        delete nextPending[roiId];
        return {
          completedRois: updatedRois,
          isDrawing: false,
          currentRoiPoints: [],
          modifyingRoiId: null,
          pendingRoiNotes: nextPending,
          roiNotesSaved: { ...state.roiNotesSaved, [roiId]: existingNotes },
        };
      });

      fetchImages();

    } catch (err) {
      set({ error: 'Failed to save ROI data.' });
    }
  },

  startModifyingRoi: (roiId) => {
    const roi = get().completedRois.find(r => r.id === roiId);
    if (roi) {
      set({
        currentRoiPoints: roi.points,
        isDrawing: true,
        modifyingRoiId: roiId,
      });
    }
  },

  cancelModifyingRoi: () => {
    set({
      modifyingRoiId: null,
      isDrawing: false,
      currentRoiPoints: [],
    });
  },

  deleteAnalysis: async (filename) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${filename}/analysis`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete analysis.');

      set({
        completedRois: [],
        currentRoiPoints: [],
        isDrawing: false,
        modifyingRoiId: null,
      });

      get().fetchImages();
    } catch (err) {
      set({ error: 'Failed to delete analysis data.' });
    }
  },

  updateRoiNotesLocal: (roiId, notes) => {
    set((state) => {
      const savedNotes = state.roiNotesSaved[roiId] ?? "";
      const nextPending = { ...state.pendingRoiNotes };
      
      // Only mark as pending if content actually changed
      if (notes !== savedNotes && notes.trim().length > 0) {
        nextPending[roiId] = notes;
      } else {
        delete nextPending[roiId];
      }
      
      return {
        completedRois: state.completedRois.map((roi) =>
          roi.id === roiId ? { ...roi, notes } : roi
        ),
        pendingRoiNotes: nextPending,
      };
    });
  },

  saveRoiNotes: async (roiId, notes, retry = false) => {
    const { selectedImage, completedRois, scaleUm, scaleBar } = get();
    if (!selectedImage) return;
    const roi = completedRois.find(r => r.id === roiId);
    if (!roi) return;

    const barPixelLength = scaleBar ? Math.sqrt((scaleBar.x2 - scaleBar.x1)**2 + (scaleBar.y2 - scaleBar.y1)**2) : 0;
    const pxPerUm = scaleUm > 0 ? barPixelLength / scaleUm : 0;

    // Notes-only save: NO version increment
    const newRoiData = {
      selection_number: roi.id,
      version: roi.version, // Keep same version for notes-only changes
      scale_px_per_um: pxPerUm,
      scale_bar: scaleBar,
      scale_um: scaleUm,
      area_um2: roi.areaUm2,
      area_px2: roi.areaPx2,
      points: roi.points,
      is_modification: true,
      is_notes_only: true, // Flag to distinguish notes-only updates
      notes,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/images/${selectedImage.filename}/roi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoiData),
      });

      if (!response.ok) {
        // First attempt failed, retry once after 200ms
        if (!retry) {
          setTimeout(() => get().saveRoiNotes(roiId, notes, true), 200);
          return;
        }
        // Retry also failed, mark as failed
        throw new Error('Failed to save ROI notes.');
      }

      // Success: clear pending state and update saved notes
      set((state) => {
        const nextPending = { ...state.pendingRoiNotes };
        delete nextPending[roiId];
        const nextFailed = new Set(state.saveFailedRoiNoteIds);
        nextFailed.delete(roiId);
        return {
          pendingRoiNotes: nextPending,
          roiNotesSaved: { ...state.roiNotesSaved, [roiId]: notes },
          saveFailedRoiNoteIds: nextFailed,
        };
      });
    } catch (err) {
      // Mark as failed - user needs to retry manually
      set((state) => {
        const nextFailed = new Set(state.saveFailedRoiNoteIds);
        nextFailed.add(roiId);
        return {
          saveFailedRoiNoteIds: nextFailed,
          error: `Failed to save notes for ROI ${roiId}. Click retry to try again.`,
        };
      });
    }
  },

  flushPendingRoiNotes: async () => {
    const pending = { ...get().pendingRoiNotes };
    for (const [roiId, notes] of Object.entries(pending)) {
      await get().saveRoiNotes(Number(roiId), notes);
    }
  },
}));
