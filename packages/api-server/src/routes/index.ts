import { Router, type IRouter } from "express";
import healthRouter from "./health";
import youtubeRouter from "./youtube";
import trimRouter from "./trim";
import chatRouter from "./chat";
import formatterRouter from "./formatter";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/yt", youtubeRouter);
router.use(trimRouter);
router.use(chatRouter);
router.use(formatterRouter);

export default router;
