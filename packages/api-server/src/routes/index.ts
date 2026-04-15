import { Router, type IRouter } from "express";
import healthRouter from "./health";
import youtubeRouter from "./youtube";
import trimRouter from "./trim";
import chatRouter from "./chat";
import formatterRouter from "./formatter";
import ocrRouter from "./ocr";
import promptgenRouter from "./promptgen";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/yt", youtubeRouter);
router.use(trimRouter);
router.use(chatRouter);
router.use(formatterRouter);
router.use(ocrRouter);
router.use(promptgenRouter);

export default router;
