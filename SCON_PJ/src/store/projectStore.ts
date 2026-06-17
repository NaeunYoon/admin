import { create } from 'zustand';
import type { Project, Task, TaskStatus } from '../types';
import { api } from '../api';

interface ProjectState {
  projects:  Project[];
  tasks:     Task[];
  loading:   boolean;
  fetchAll:  () => Promise<void>;
  addProject:    (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  addTask:    (task: Task) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask:   (taskId: string, newStatus: TaskStatus, newOrder: number) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  tasks:    [],
  loading:  false,

  fetchAll: async () => {
    set({ loading: true });
    const [projects, tasks] = await Promise.all([api.getProjects(), api.getTasks()]);
    set({ projects, tasks, loading: false });
    // 업무는 사용자가 둔 칸반 상태(할일/진행중/검토/완료)를 그대로 유지한다.
    // (이전: 시작일이 지난 todo를 자동으로 in_progress 전환 → 새로고침 시 할일이 진행중으로 넘어가는 버그)
  },

  addProject: async (project) => {
    await api.createProject(project);
    set(s => ({ projects: [...s.projects, project] }));
  },

  updateProject: async (id, updates) => {
    await api.updateProject(id, updates);
    set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p) }));
  },

  addTask: async (task) => {
    await api.createTask(task);
    set(s => ({ tasks: [...s.tasks, task] }));
  },

  updateTask: async (id, updates) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const merged = { ...task, ...updates, updatedAt: new Date().toISOString() };
    await api.updateTask(id, merged);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? merged : t) }));
  },

  deleteTask: async (id) => {
    await api.deleteTask(id);
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
  },

  moveTask: async (taskId, newStatus, newOrder) => {
    await api.moveTask(taskId, newStatus, newOrder);
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus, order: newOrder, updatedAt: new Date().toISOString() }
          : t
      ),
    }));
  },
}));
