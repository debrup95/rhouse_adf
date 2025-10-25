import express from 'express';
import underwriteSliderLoaderService from '../../services/estimate/underwriteSliderLoaderService';

const router = express.Router();

// Add middleware to log all requests
router.use((req, res, next) => {
    console.log(`Underwrite Sliders API called: ${req.method} ${req.url}`);
    next();
});

/**
 * @route   GET /api/underwrite-sliders/debug
 * @desc    Debug route to verify the current default values
 * @access  Public
 */
router.get('/debug', (req, res) => {
    // Set no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Get the default values directly
    const defaultValues = underwriteSliderLoaderService.getDefaultUnderwriteValues();
    
    // Add timestamp to verify this is a fresh response
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: defaultValues,
        message: 'This is a debug endpoint to verify current default values'
    });
});

/**
 * @route   GET /api/underwrite-sliders
 * @desc    Get default underwrite slider values
 * @access  Public
 */
router.get('/', underwriteSliderLoaderService.getUnderwriteValues);

/**
 * @route   GET /api/underwrite-sliders/:propertyId
 * @desc    Get underwrite slider values for a specific property
 * @access  Public
 */
router.get('/:propertyId', underwriteSliderLoaderService.getUnderwriteValues);

/**
 * @route   POST /api/underwrite-sliders/:propertyId/calculate
 * @desc    Calculate underwrite slider values using rental properties and address data
 * @access  Public
 */
router.post('/:propertyId/calculate', underwriteSliderLoaderService.getUnderwriteValues);

/**
 * @route   POST /api/underwrite-sliders
 * @desc    Save underwrite slider values for a property
 * @access  Public
 */
router.post('/', underwriteSliderLoaderService.saveUnderwriteValues);

export default router; 