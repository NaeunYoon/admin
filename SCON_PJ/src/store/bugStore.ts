import { create } from 'zustand';
import { api } from '../api';

export interface Bug {
  id:           string;
  title:        string;
  description:  string;
  status:       string;   // 접수 / 진행중 / 보류 / 해결
  severity:     string;   // 낮음 / 보통 / 높음 / 긴급
  reporterId?:  string;
  reporterName?: string;
  createdAt?:   string;
  updatedAt?:   string;
}

const STATUS_ORDER = ['접수', '진행중', '보류', '해결'];
const sortBugs = (bugs: Bug[]) =>
  [...bugs].sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

interface BugState {
  bugs:    Bug[];
  loading: boolean;
  fetchBugs:  () => Promise<void>;
  addBug:     (data: { title: string; description?: string; severity?: string }) => Promise<void>;
  updateBug:  (id: string, data: Partial<Bug>) => Promise<void>;
  removeBug:  (id: string) => Promise<void>;
}

export const useBugStore = create<BugState>()((set) => ({
  bugs:    [],
  loading: false,
  fetchBugs: async () => {
    set({ loading: true });
    try { const bugs = await api.getBugs(); set({ bugs: sortBugs(bugs as Bug[]), loading: false }); }
    catch { set({ loading: false }); }
  },
  addBug: async (data) => {
    const created = await api.createBug(data);
    set(s => ({ bugs: sortBugs([created as Bug, ...s.bugs]) }));
  },
  updateBug: async (id, data) => {
    const updated = await api.updateBug(id, data);
    set(s => ({ bugs: sortBugs(s.bugs.map(b => b.id === id ? { ...b, ...(updated as Bug) } : b)) }));
  },
  removeBug: async (id) => {
    await api.deleteBug(id);
    set(s => ({ bugs: s.bugs.filter(b => b.id !== id) }));
  },
}));
