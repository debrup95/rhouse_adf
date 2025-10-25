import { Router } from 'express';
import {
  createStateInterest,
  getStateInterests,
  updateStateInterestStatus
} from '../../controllers/stateInterestController';

const router = Router();

/**
 * @route POST /api/state-interest
 * @desc Create a new state interest request
 * @access Public
 * @body {
 *   userId?: string | number | null,
 *   email: string,
 *   states: string[],
 *   source: string
 * }
 */
router.post('/', createStateInterest);

/**
 * @route GET /api/state-interest
 * @desc Get state interest requests for current user or by email
 * @access Public (with user auth) / Admin (with email query)
 * @query email?: string (admin only)
 */
router.get('/', getStateInterests);

/**
 * @route PUT /api/state-interest/:requestId/status
 * @desc Update state interest request status
 * @access Admin
 * @body { status: 'active' | 'notified' | 'unsubscribed' }
 */
router.put('/:requestId/status', updateStateInterestStatus);

export default router;
