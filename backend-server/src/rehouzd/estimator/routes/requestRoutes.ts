import express from 'express';
import { requestController } from '../controllers/requestController';

const router = express.Router();

/**
 * @route POST /api/requests/offer-matching
 * @desc Create a new offer matching request
 * @access Public (requires user_id)
 */
router.post('/offer-matching', requestController.createOfferMatchingRequest.bind(requestController));

/**
 * @route POST /api/requests/underwrite
 * @desc Create a new underwrite request
 * @access Public (requires user_id)
 */
router.post('/underwrite', requestController.createUnderwriteRequest.bind(requestController));

/**
 * @route POST /api/requests/offers/request
 * @desc Create a new offer request using property_images table
 * @access Public (requires user_id)
 */
router.post('/offers/request', requestController.createOfferRequest.bind(requestController));

/**
 * @route GET /api/requests/offer-matching
 * @desc Get all offer matching requests (admin)
 * @access Admin
 */
router.get('/offer-matching', requestController.getAllOfferMatchingRequests.bind(requestController));

/**
 * @route GET /api/requests/underwrite
 * @desc Get all underwrite requests (admin)
 * @access Admin
 */
router.get('/underwrite', requestController.getAllUnderwriteRequests.bind(requestController));

/**
 * @route GET /api/requests/offers
 * @desc Get all offer requests (admin) using property_images table
 * @access Admin
 */
router.get('/offers', requestController.getAllOfferRequests.bind(requestController));

/**
 * @route GET /api/requests/offer-sourcing/status/:userId
 * @desc Get offer sourcing request status for a specific user
 * @access Public
 */
router.get('/offer-sourcing/status/:userId', requestController.getOfferSourcingStatus.bind(requestController));

export default router; 