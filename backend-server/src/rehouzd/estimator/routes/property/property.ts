import { Router } from 'express';
import propertyController from '../../controllers/propertyController';
import * as specialistController from '../../controllers/specialistController';

const router = Router();

// Property data route
router.post('/property-data', propertyController.getPropertyAndMarketData);

// Address validation route
router.post('/validate-address', propertyController.validateAddress);

// Get homes sold count by zip code
router.get('/homes-sold-count/:zipCode', propertyController.getHomesSoldCount);

// Search history route
router.get('/search-history/:userId', propertyController.getUserSearchHistory);

// Property image routes
router.post('/images/upload', propertyController.upload.array('images', 10), propertyController.uploadPropertyImages);
router.get('/images/:userId/:propertyAddress', propertyController.getPropertyImageInfo);
router.delete('/images/delete', propertyController.deletePropertyImage);

export default router;
