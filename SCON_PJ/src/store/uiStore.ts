import { create } from 'zustand';

interface UiState {
  globalTaskId: string | null;
  openTask: (id: string) => void;
  closeTask: () => void;
}

export const useUiStore = create<UiState>()(set => ({
  globalTaskId: null,
  openTask:  (id) => set({ globalTaskId: id }),
  closeTask: ()   => set({ globalTaskId: null }),
}));
