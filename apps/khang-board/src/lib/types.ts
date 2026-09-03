// Khang Board — type definitions

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  progress: number; // 0-100
  eta: string | null; // ISO date string
  note: string; // markdown
  createdAt: number;
  updatedAt: number;
}

export interface UpdateMessage {
  id: string;
  text: string; // markdown
  createdAt: number;
  edited: boolean;
}

export interface ProjectState {
  meta: ProjectMeta;
  tasks: Task[];
  updates: UpdateMessage[];
}

export interface BoardState {
  projects: Record<string, ProjectState>;
  activeProjectId: string;
}
