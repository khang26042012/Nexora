import { Router, type IRouter } from "express";
import healthRouter from "./health";
import youtubeRouter from "./youtube";
import trimRouter from "./trim";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/yt", youtubeRouter);
router.use(trimRouter);

export default router;
