export type Role = 'admin' | 'manager' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
  projectIds: string[]; // 접근 가능한 프로젝트
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  code: string; // ex: SCON-001
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  ownerId: string;
  memberIds: string[];
  nasPath?: string; // NAS 연결 경로
  createdAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId: string;
  startDate?: string;
  dueDate?: string;
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  order: number;
  checklistTotal?: number;
  checklistDone?:  number;
  startedAt?:   string | null;
  reviewedAt?:  string | null;
  completedAt?: string | null;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  size: number;
  type: string;
  nasPath: string;
  uploadedById: string;
  uploadedAt: string;
}

export interface NasFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'folder';
  mimeType?: string;
  modifiedAt: string;
  children?: NasFile[];
}
