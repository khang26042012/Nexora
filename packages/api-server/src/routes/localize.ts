import { Router, type Request, type Response } from "express";

const router = Router();

router.post("/translate", (req: Request, res: Response) => {
  // DEBUG: dump everything we know about the request
  res.json({
    contentType: req.headers["content-type"],
    bodyKeys: req.body ? Object.keys(req.body) : "no body",
    bodyString: typeof req.body === "string" ? req.body.slice(0, 200) : null,
    bodyJson: req.body,
    rawBody: (req as any).rawBody?.slice(0, 200),
    hasJson: typeof (req as any).json === "function",
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers).slice(0, 20)
  });
});

export default router;
