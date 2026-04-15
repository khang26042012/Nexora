import { Router, type Request, type Response } from "express";
import { createNote, getNoteById, noteIdExists } from "../lib/notes-db.js";

const router = Router();

const CUSTOM_ID_RE = /^[a-zA-Z0-9_-]{3,50}$/;

router.post("/notes", (req: Request, res: Response) => {
  const { title = "", content, customId } = req.body as {
    title?: string;
    content?: string;
    customId?: string;
  };

  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: "Nội dung note không được để trống" });
    return;
  }

  if (content.length > 100_000) {
    res.status(400).json({ error: "Nội dung quá dài (tối đa 100.000 ký tự)" });
    return;
  }

  if (customId !== undefined) {
    if (!CUSTOM_ID_RE.test(customId)) {
      res.status(400).json({ error: "Slug chỉ được dùng chữ cái, số, dấu - hoặc _, độ dài 3–50 ký tự" });
      return;
    }
    if (noteIdExists(customId)) {
      res.status(409).json({ error: "Slug này đã được dùng, hãy chọn slug khác" });
      return;
    }
  }

  const id = createNote(title.slice(0, 200), content, customId);
  res.json({ id });
});

router.get("/notes/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const note = getNoteById(id);

  if (!note) {
    res.status(404).json({ error: "Không tìm thấy note" });
    return;
  }

  res.json(note);
});

export default router;
