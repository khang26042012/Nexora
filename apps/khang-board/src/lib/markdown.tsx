// Tiny markdown renderer — supports bold, italic, code, links, line breaks
import React from "react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMarkdown(input: string): React.ReactNode {
  if (!input) return null;
  const lines = input.split("\n");
  const out: React.ReactNode[] = [];
  lines.forEach((line, idx) => {
    if (!line.trim()) {
      out.push(<br key={idx} />);
      return;
    }
    let html = escapeHtml(line);
    // Code `x`
    html = html.replace(/`([^`]+)`/g, (_, code) =>
      `<code class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-accent">${code}</code>`,
    );
    // Bold **x**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
    // Italic *x*
    html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em class="italic">$2</em>');
    // Links [text](url)
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer" class="text-primary underline-offset-2 hover:underline">$1</a>',
    );
    out.push(
      <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />,
    );
  });
  return out;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${date} ${time}`;
}

export function formatDateLong(ts: number): string {
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
