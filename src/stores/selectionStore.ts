import { create } from 'zustand';
import { ArrowStyle, ArrowType, ZoneShape } from '../core/types';

export type EditorTool = 'select' | 'arrow' | 'zone' | 'pen' | 'highlighter' | 'note' | 'eraser';

interface SelectionState {
  activeTool: EditorTool;
  activeArrowType: ArrowType;
  activeArrowStyle: ArrowStyle;
  activeZoneShape: ZoneShape;
  activeColor: string;
  selectedIds: string[];
  hoveredId: string | null;
  setActiveTool: (tool: EditorTool) => void;
  setActiveArrowType: (type: ArrowType) => void;
  setActiveArrowStyle: (style: ArrowStyle) => void;
  setActiveZoneShape: (shape: ZoneShape) => void;
  setActiveColor: (color: string) => void;
  selectSingle: (id: string | null) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  setHoveredId: (id: string | null) => void;
}

const ARROW_COLOR_MAP: Record<ArrowType, string> = {
  pass: '#00E5FF',
  run: '#A8FF60',
  cross: '#FFB020',
  pressing: '#FF4D6D',
  transition: '#C084FC',
};

const ARROW_STYLE_MAP: Record<ArrowType, ArrowStyle> = {
  pass: 'straight',
  run: 'dashed',
  cross: 'curved',
  pressing: 'dashed',
  transition: 'curved',
};

export const useSelectionStore = create<SelectionState>((set) => ({
  activeTool: 'select',
  activeArrowType: 'pass',
  activeArrowStyle: 'straight',
  activeZoneShape: 'rect',
  activeColor: '#00E5FF',
  selectedIds: [],
  hoveredId: null,
  setActiveTool: (activeTool) => set({ activeTool }),
  setActiveArrowType: (activeArrowType) => {
    set({
      activeArrowType,
      activeColor: ARROW_COLOR_MAP[activeArrowType],
      activeArrowStyle: ARROW_STYLE_MAP[activeArrowType],
    });
  },
  setActiveArrowStyle: (activeArrowStyle) => set({ activeArrowStyle }),
  setActiveZoneShape: (activeZoneShape) => set({ activeZoneShape }),
  setActiveColor: (activeColor) => set({ activeColor }),
  selectSingle: (id) => set({ selectedIds: id ? [id] : [] }),
  toggleSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((item) => item !== id)
        : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
}));

