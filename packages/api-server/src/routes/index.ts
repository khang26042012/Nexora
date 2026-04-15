import { Router, type IRouter } from "express";
import healthRouter from "./health";
import youtubeRouter from "./youtube";
import trimRouter from "./trim";
import chatRouter from "./chat";
import formatterRouter from "./formatter";
import ocrRouter from "./ocr";
import promptgenRouter from "./promptgen";
import notesRouter from "./notes";
import adminRouter from "./admin";
import summarizerRouter from "./summarizer";
import translatorRouter from "./translator";
import compressRouter from "./compress";
import codeexplainerRouter from "./codeexplainer";
import mathsolverRouter from "./mathsolver";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/yt", youtubeRouter);
router.use(trimRouter);
router.use(chatRouter);
router.use(formatterRouter);
router.use(ocrRouter);
router.use(promptgenRouter);
router.use(notesRouter);
router.use(adminRouter);
router.use(summarizerRouter);
router.use(translatorRouter);
router.use(compressRouter);
router.use(codeexplainerRouter);
router.use(mathsolverRouter);

export default router;
