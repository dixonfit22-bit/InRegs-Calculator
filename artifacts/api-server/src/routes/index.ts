import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import aiCoachRouter from "./ai/coach";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(aiCoachRouter);

export default router;
