import { create } from 'zustand';
import { api } from '../api';

export interface WorkLog {
  id:             string;
  userId:         string;
  taskId?:        string | null;
  projectId?:     string | null;
  taskTitle?:     string | null;
  taskProjectId?: string | null;
  logDate:        string;
  startTime:      string;
  endTime?:       string | null;
  content:        string;
  category?:      string | null;
  userName?:      string;
  userDepartment?: string;
  userRole?:      string;
  createdAt?:     string;
  updatedAt?:     string;
}

export interface DailyMeta {
  id?:          string;
  userId:       string;
  logDate:      string;
  todayGoal:    string;
  tomorrowGoal: string;
  overtime:     string;
  issues:       string;
  weekGoal:     string;
}

export interface LeaveSpan {
  id:        number;
  startDate: string;
  endDate:   string;
  type:      string;        // 연차 / 병가 / 반차 / 반반차 / 포상휴가
  period:    string | null; // 오전 / 오후 / N교시 / null
}

// 종일 휴가 여부 (연차·병가는 항상 종일, 포상휴가는 시간대 없을 때만 종일)
export function isFullDayLeave(l: LeaveSpan): boolean {
  if (l.type === '연차' || l.type === '병가') return true;
  if (l.type === '포상휴가' && !l.period) return true;
  return false;
}

export function leaveLabel(l: LeaveSpan): string {
  if (l.type === '반차')   return `${l.period ?? ''} 반차`.trim();
  if (l.type === '반반차') return `반반차 ${l.period ?? ''}`.trim();
  if (l.type === '포상휴가') return l.period ? `포상 ${l.period}` : '포상휴가';
  return l.type;
}

interface WorkLogState {
  logs:      WorkLog[];
  dailyMeta: Record<string, DailyMeta>; // key: userId_logDate
  leaves:    LeaveSpan[];
  loading:   boolean;

  fetchLogs:  (params?: { userId?: string; taskId?: string; projectId?: string; date?: string; startDate?: string; endDate?: string }) => Promise<void>;
  fetchDaily: (params?: { userId?: string; startDate?: string; endDate?: string; date?: string }) => Promise<void>;
  fetchLeave: (params?: { userId?: string; startDate?: string; endDate?: string }) => Promise<void>;
  saveDaily:  (data: Omit<DailyMeta, 'id'>) => Promise<void>;

  addLog:    (data: Omit<WorkLog, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WorkLog>;
  editLog:   (id: string, data: Partial<WorkLog>) => Promise<void>;
  removeLog: (id: string) => Promise<void>;
}

export const useWorkLogStore = create<WorkLogState>()((set, get) => ({
  logs:      [],
  dailyMeta: {},
  leaves:    [],
  loading:   false,

  fetchLeave: async (params) => {
    try {
      const rows = await api.getLeave(params);
      set({ leaves: rows as LeaveSpan[] });
    } catch { set({ leaves: [] }); }
  },

  fetchLogs: async (params) => {
    set({ loading: true });
    try {
      const logs = await api.getWorkLogs(params);
      set({ logs, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchDaily: async (params) => {
    try {
      const rows = await api.getWorkLogDaily(params);
      const meta: Record<string, DailyMeta> = { ...get().dailyMeta };
      rows.forEach((r: DailyMeta) => {
        meta[`${r.userId}_${r.logDate}`] = r;
      });
      set({ dailyMeta: meta });
    } catch { /* ignore */ }
  },

  saveDaily: async (data) => {
    await api.saveWorkLogDaily(data);
    const key = `${data.userId}_${data.logDate}`;
    set(s => ({ dailyMeta: { ...s.dailyMeta, [key]: { ...data } } }));
  },

  addLog: async (data) => {
    const created: WorkLog = await api.createWorkLog(data);
    set(s => ({ logs: [created, ...s.logs] }));
    return created;
  },

  editLog: async (id, data) => {
    await api.updateWorkLog(id, data);
    set(s => ({ logs: s.logs.map(l => l.id === id ? { ...l, ...data } : l) }));
  },

  removeLog: async (id) => {
    await api.deleteWorkLog(id);
    set(s => ({ logs: s.logs.filter(l => l.id !== id) }));
  },
}));
