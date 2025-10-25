import { Router } from 'express';
import getPropertyAndMarketData from "../property/getPropertyAndMarketData";
import specialistCallHandler from "../callback/specialistCallHandler";

const router = Router();

router.post('/request-callback', specialistCallHandler);
router.post('/property-data', getPropertyAndMarketData);

export default router;
