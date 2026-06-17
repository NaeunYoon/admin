import { tokenStore } from './tokenStore';

const BASE = '/pm/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { headers, ...options });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  // auth
  login: (email: string, password: string) =>
    req<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // 어드민(인트라넷) SSO — 핸드오프 토큰으로 로그인
  sso: (token: string) =>
    req<{ token: string; user: any }>('/auth/sso', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // users
  getUsers:    ()             => req<any[]>('/users'),
  getUserById: (id: string)   => req<any>(`/users/${id}`),
  createUser:  (data: any)    => req<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser:  (id: string, data: any) => req<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser:  (id: string)   => req<any>(`/users/${id}`, { method: 'DELETE' }),

  // projects
  getProjects:   ()                        => req<any[]>('/projects'),
  getProject:    (id: string)              => req<any>(`/projects/${id}`),
  createProject: (data: any)               => req<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any)   => req<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // checklists
  getChecklist:    (taskId: string)                           => req<any[]>(`/checklists/${taskId}`),
  addCheckItem:    (taskId: string, content: string)          => req<any>(`/checklists/${taskId}`, { method: 'POST', body: JSON.stringify({ content }) }),
  toggleCheckItem: (taskId: string, itemId: string, is_done: boolean) =>
    req<any>(`/checklists/${taskId}/${itemId}`, { method: 'PATCH', body: JSON.stringify({ is_done }) }),
  updateCheckItem: (taskId: string, itemId: string, content: string) =>
    req<any>(`/checklists/${taskId}/${itemId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteCheckItem: (taskId: string, itemId: string)           => req<any>(`/checklists/${taskId}/${itemId}`, { method: 'DELETE' }),

  // comments
  getComments:   (taskId: string)              => req<any[]>(`/comments/${taskId}`),
  addComment:    (taskId: string, content: string) =>
    req<any>(`/comments/${taskId}`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (taskId: string, commentId: string) =>
    req<any>(`/comments/${taskId}/${commentId}`, { method: 'DELETE' }),

  // notifications
  getNotifications:        ()           => req<any[]>('/notifications'),
  markNotificationRead:    (id: string) => req<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: ()          => req<any>('/notifications/read-all',   { method: 'PATCH' }),

  // work logs
  getWorkLogs: (params?: { userId?: string; taskId?: string; projectId?: string; date?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.userId)     q.set('userId',     params.userId);
    if (params?.taskId)     q.set('taskId',     params.taskId);
    if (params?.projectId)  q.set('projectId',  params.projectId);
    if (params?.date)       q.set('date',       params.date);
    if (params?.startDate)  q.set('startDate',  params.startDate);
    if (params?.endDate)    q.set('endDate',    params.endDate);
    const qs = q.toString();
    return req<any[]>(`/work-logs${qs ? `?${qs}` : ''}`);
  },
  createWorkLog: (data: any) => req<any>('/work-logs', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkLog: (id: string, data: any) => req<any>(`/work-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkLog: (id: string) => req<any>(`/work-logs/${id}`, { method: 'DELETE' }),

  // work log daily meta (goals / issues)
  getWorkLogDaily: (params?: { userId?: string; startDate?: string; endDate?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.userId)    q.set('userId',    params.userId);
    if (params?.date)      q.set('date',      params.date);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate)   q.set('endDate',   params.endDate);
    const qs = q.toString();
    return req<any[]>(`/work-log-daily${qs ? `?${qs}` : ''}`);
  },
  saveWorkLogDaily: (data: any) => req<any>('/work-log-daily', { method: 'PUT', body: JSON.stringify(data) }),

  // monthly plans
  getMonthlyPlans: (params: { year: number }) => {
    const q = new URLSearchParams({ year: String(params.year) });
    return req<any[]>(`/monthly-plans?${q.toString()}`);
  },
  createMonthlyPlan: (data: any) =>
    req<any>('/monthly-plans', { method: 'POST', body: JSON.stringify(data) }),
  updateMonthlyPlan: (id: string, data: any) =>
    req<any>(`/monthly-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMonthlyPlan: (id: string) =>
    req<any>(`/monthly-plans/${id}`, { method: 'DELETE' }),

  // 휴가 (어드민 admindb 연동 — 업무일지 동기화)
  getLeave: (params?: { userId?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.userId)    q.set('userId',    params.userId);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate)   q.set('endDate',   params.endDate);
    const qs = q.toString();
    return req<any[]>(`/leave${qs ? `?${qs}` : ''}`);
  },

  // 버그 트래커
  getBugs:   ()                      => req<any[]>('/bugs'),
  createBug: (data: any)             => req<any>('/bugs', { method: 'POST', body: JSON.stringify(data) }),
  updateBug: (id: string, data: any) => req<any>(`/bugs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBug: (id: string)            => req<any>(`/bugs/${id}`, { method: 'DELETE' }),

  // tasks
  getTasks:   (projectId?: string) =>
    req<any[]>('/tasks' + (projectId ? `?projectId=${projectId}` : '')),
  createTask: (data: any)                  => req<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any)      => req<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string)                 => req<any>(`/tasks/${id}`, { method: 'DELETE' }),
  moveTask:   (id: string, status: string, order: number) =>
    req<any>(`/tasks/${id}/move`, { method: 'PATCH', body: JSON.stringify({ status, order }) }),
};
