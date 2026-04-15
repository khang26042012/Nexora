import { Router, type Request, type Response } from "express";
import { createNote, getNoteById } from "../lib/notes-db.js";

const router = Router();

router.post("/notes", (req: Request, res: Response) => {
  const { title = "", content } = req.body as {
    title?: string;
    content?: string;
  };

  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: "Nội dung note không được để trống" });
    return;
  }

  if (content.length > 100_000) {
    res.status(400).json({ error: "Nội dung quá dài (tối đa 100.000 ký tự)" });
    return;
  }

  const id = createNote(title.slice(0, 200), content);
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
