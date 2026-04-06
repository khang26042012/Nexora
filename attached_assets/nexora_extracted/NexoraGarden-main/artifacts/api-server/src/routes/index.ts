import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import nexoraRouter from "./nexora.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(nexoraRouter);

export default router;
