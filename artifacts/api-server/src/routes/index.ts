import { Router, type IRouter } from "express";
import healthRouter from "./health";
import namesRouter from "./names";
import indexStatsRouter from "./index-stats";
import claimsRouter from "./claims";
import forgeRouter from "./forge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(namesRouter);
router.use(indexStatsRouter);
router.use(claimsRouter);
router.use(forgeRouter);

export default router;
