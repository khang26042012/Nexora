// Khang Board — API client
import type { BoardState, ProjectState, Task, UpdateMessage, ProjectMeta } from "./types";

const BASE = "/api";

class ApiError extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.json();
}

// === Auth ===

export async function adminLogin(password: string): Promise<{ ok: true }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function adminLogout(): Promise<{ ok: true }> {
  return request("/auth/logout", { method: "POST" });
}

export async function adminStatus(): Promise<{ authenticated: boolean }> {
  return request("/auth/status");
}

// === State ===

export async function getState(): Promise<BoardState> {
  return request("/state");
}

export async function saveState(state: BoardState): Promise<{ ok: true }> {
  return request("/state", {
    method: "PUT",
    body: JSON.stringify(state),
  });
}

// === Project ===

export async function updateProjectMeta(
  projectId: string,
  meta: Partial<ProjectMeta>,
): Promise<{ ok: true; project: ProjectState }> {
  return request(`/project/${encodeURIComponent(projectId)}/meta`, {
    method: "PATCH",
    body: JSON.stringify(meta),
  });
}

export async function createProject(meta: ProjectMeta): Promise<{ ok: true; project: ProjectState }> {
  return request("/project", {
    method: "POST",
    body: JSON.stringify(meta),
  });
}

export async function deleteProject(projectId: string): Promise<{ ok: true }> {
  return request(`/project/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}

// === Tasks ===

export async function addTask(
  projectId: string,
  title: string,
): Promise<{ ok: true; task: Task }> {
  return request(`/project/${encodeURIComponent(projectId)}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function updateTask(
  projectId: string,
  taskId: string,
  patch: Partial<Task>,
): Promise<{ ok: true; task: Task }> {
  return request(
    `/project/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export async function deleteTask(
  projectId: string,
  taskId: string,
): Promise<{ ok: true }> {
  return request(
    `/project/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: "DELETE" },
  );
}

// === Updates (timeline) ===

export async function postUpdate(
  projectId: string,
  text: string,
): Promise<{ ok: true; update: UpdateMessage }> {
  return request(`/project/${encodeURIComponent(projectId)}/updates`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function editUpdate(
  projectId: string,
  updateId: string,
  text: string,
): Promise<{ ok: true; update: UpdateMessage }> {
  return request(
    `/project/${encodeURIComponent(projectId)}/updates/${encodeURIComponent(updateId)}`,
    { method: "PATCH", body: JSON.stringify({ text }) },
  );
}

export async function deleteUpdate(
  projectId: string,
  updateId: string,
): Promise<{ ok: true }> {
  return request(
    `/project/${encodeURIComponent(projectId)}/updates/${encodeURIComponent(updateId)}`,
    { method: "DELETE" },
  );
}
