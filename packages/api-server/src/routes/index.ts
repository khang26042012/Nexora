import { Router, type IRouter } from "express";
import healthRouter from "./health";
import youtubeRouter from "./youtube";
import trimRouter from "./trim";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/yt", youtubeRouter);
router.use(trimRouter);
router.use(chatRouter);

export default router;
