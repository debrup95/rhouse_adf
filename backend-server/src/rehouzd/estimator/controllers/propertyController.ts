import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import propertyService from '../services/property/propertyService';
import marketService from '../services/property/marketService';
import logger from '../utils/logger';
import { catchAsync } from '../middleware/errorHandler';
import azureBlobService from '../utils/storage/azureBlobService';
import { createOrUpdatePropertyImage, getPropertyImages } from '../models/property/propertyImageModel';
import { getUserById } from '../models/auth/authModel';
import { extractUserContext } from '../types/userActivity';
import parclLabsClient from '../utils/api/parclLabsClient';

/**
 * Get user search history controller
 */
export const getUserSearchHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  
  if (!userId || isNaN(userId)) {
    res.status(400).json({
      success: false,
      message: 'Valid user ID is required',
    });
    return;
  }

  const searchHistory = await propertyService.getUserSearchHistory(userId);
  
  res.status(200).json({
    success: true,
    data: searchHistory
  });
});

/**
 * Controller for getting property and market data
 * Returns enriched property data with comparable properties analysis
 */
export const getPropertyAndMarketData = catchAsync(async (req: Request, res: Response) => {
  // Extract user context for activity tracking
  const userContext = extractUserContext(req);
  
  const propertyAnalysis = await propertyService.getPropertyAndMarketData(req.body, userContext);
  
  res.status(200).json(propertyAnalysis);
});

/**
 * Controller for validating address with Parcl Labs
 * Uses the exact same logic as getPropertyAndMarketData but only for address search
 */
export const validateAddress = catchAsync(async (req: Request, res: Response) => {
  try {
    // Extract address from the input (same as getPropertyAndMarketData)
    const addressObj = req.body.address || req.body;
    
    // Use the exact same formatAddress logic as getPropertyAndMarketData
    const { address, city, zip_code, state_abbreviation, lat, lon } = propertyService.formatAddress(addressObj);
    logger.info('Processing address validation request', { address, city, state_abbreviation });

    // Get address data first (exact same call as getPropertyAndMarketData)
    const addressDataResponse = await parclLabsClient.searchAddress([{ address, city, state_abbreviation, zip_code }]);
    const addressData = addressDataResponse.data;


    if (!addressData.items?.length) {
      logger.warn('No property data found during validation', { address, city, state_abbreviation });
      res.status(200).json({
        success: true,
        isValid: false,
        message: 'Address not found in our database'
      });
      return;
    }

    // Extract property details (same as getPropertyAndMarketData)
    const propertyDetails = addressData.items[0];
    
    logger.info('Property details from Parcl Labs:', {
      address: propertyDetails.address,
      state: propertyDetails.state_abbreviation,
      requestedState: state_abbreviation,
      zip: propertyDetails.zip_code,
      requestedZip: zip_code,
      city: propertyDetails.city,
      requestedCity: city,
      propertyType: propertyDetails.property_type
    });
    
    // Validate that the returned property's state matches the requested state
    if (propertyDetails.state_abbreviation && propertyDetails.state_abbreviation !== state_abbreviation) {
      logger.warn('State mismatch during validation', {
        requestedState: state_abbreviation,
        returnedState: propertyDetails.state_abbreviation,
        address: propertyDetails.address
      });
      
      res.status(200).json({
        success: true,
        isValid: false,
        message: 'Address not found in our database for the specified state'
      });
      return;
    }
    
    // Validate that the returned property's ZIP code matches the requested ZIP code
    if (zip_code && propertyDetails.zip_code) {
      // Normalize ZIP codes by removing any non-digit characters for comparison
      const normalizedRequestedZip = zip_code.replace(/\D/g, '');
      const normalizedReturnedZip = propertyDetails.zip_code.replace(/\D/g, '');
      
      if (normalizedRequestedZip !== normalizedReturnedZip) {
        logger.warn('ZIP code mismatch during validation', {
          requestedZip: zip_code,
          returnedZip: propertyDetails.zip_code,
          normalizedRequestedZip,
          normalizedReturnedZip,
          address: propertyDetails.address,
          state: propertyDetails.state_abbreviation
        });
        
        res.status(200).json({
          success: true,
          isValid: false,
          message: 'Address not found in our database for the specified ZIP code'
        });
        return;
      }
    } else if (zip_code && !propertyDetails.zip_code) {
      // If we have a requested ZIP but no returned ZIP, that's suspicious
      logger.warn('Missing ZIP code in returned property data', {
        requestedZip: zip_code,
        address: propertyDetails.address,
        state: propertyDetails.state_abbreviation
      });
      
      res.status(200).json({
        success: true,
        isValid: false,
        message: 'Address not found in our database for the specified ZIP code'
      });
      return;
    }
    
    // Check if property is a single-family home (same logic as getPropertyAndMarketData)
    if (propertyDetails.property_type && (propertyDetails.property_type !== 'SINGLE_FAMILY' 
                                          && propertyDetails.property_type !== 'OTHER')) {
      logger.info('Non-single family home detected during validation', { 
        propertyType: propertyDetails.property_type,
        address: propertyDetails.address 
      });
      
      res.status(200).json({
        success: true,
        isValid: false,
        message: 'Property type not supported. We currently support single-family homes only.'
      });
      return;
    }
    
    logger.info('Address validation completed successfully', {
      address,
      city,
      state_abbreviation,
      zip_code,
      propertyType: propertyDetails.property_type,
      returnedAddress: propertyDetails.address,
      returnedCity: propertyDetails.city,
      returnedState: propertyDetails.state_abbreviation,
      returnedZip: propertyDetails.zip_code
    });
    
    res.status(200).json({
      success: true,
      isValid: true,
      message: 'Address validated successfully'
    });
  } catch (error: any) {
    // Handle 404 as invalid address (same as getPropertyAndMarketData)
    if (error.response && error.response.status === 404) {
      logger.warn('Address validation returned 404', {
        address: req.body.address,
        city: req.body.city,
        state_abbreviation: req.body.state_abbreviation,
        zip_code: req.body.zip_code
      });
      
      res.status(200).json({
        success: true,
        isValid: false,
        message: 'Address not found in our database'
      });
    } else {
      logger.error('Address validation failed', {
        address: req.body.address,
        city: req.body.city,
        state_abbreviation: req.body.state_abbreviation,
        zip_code: req.body.zip_code,
        error: error.message
      });
      throw error;
    }
  }
});

// Configure multer storage for image uploads
const storage = multer.memoryStorage();

// Set up file filter for images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept image files only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Configure multer upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size (matches frontend)
  },
});

// Maximum number of images allowed per property
const MAX_IMAGES_PER_PROPERTY = 10;

/**
 * Upload property images controller
 */
export const uploadPropertyImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const { userId, propertyAddress, type } = req.body;

    // Debug logging
    logger.info('Upload request body:', { 
      userId, 
      propertyAddress, 
      type,
      bodyKeys: Object.keys(req.body),
      filesCount: files?.length || 0
    });

    // Validate request
    if (!userId || !propertyAddress) {
      res.status(400).json({
        success: false,
        message: 'User ID and property address are required',
      });
      return;
    }

    // Check the number of files
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
      return;
    }

    if (files.length > MAX_IMAGES_PER_PROPERTY) {
      res.status(400).json({
        success: false,
        message: `Maximum ${MAX_IMAGES_PER_PROPERTY} images allowed per property`,
      });
      return;
    }

    // Generate container name based on type
    const cleanType = type?.trim()?.toLowerCase();
    logger.info(`Upload request received with type: "${type}" (cleaned: "${cleanType}") for user ${userId}`);
    logger.info(`Type comparison: cleanType === 'underwrite': ${cleanType === 'underwrite'}, cleanType === 'getoffer': ${cleanType === 'getoffer'}`);
    let containerName;
    if (cleanType === 'underwrite') {
      // Get user information for better container naming
      try {
        const user = await getUserById(parseInt(userId));
        if (user) {
          logger.info(`Calling generateUnderwriteRequestContainerName for user ${user.email}`);
          containerName = azureBlobService.generateUnderwriteRequestContainerName(
            user.email,
            userId,
            user.first_name,
            user.last_name,
            propertyAddress
          );
          logger.info(`Generated underwrite request container name for user ${user.email}: ${containerName}`);
        } else {
          // Fallback to original naming if user not found
          containerName = `underwrite-${userId}-${Date.now()}`;
          logger.warn(`User not found for ID ${userId}, using fallback underwrite container name: ${containerName}`);
        }
      } catch (error) {
        logger.warn('Could not retrieve user information for underwrite container naming, using fallback', { userId, error });
        containerName = `underwrite-${userId}-${Date.now()}`;
      }
    } else if (cleanType === 'getoffer') {
      // Get user information for get offer container naming (same as underwrite for consistency)
      try {
        const user = await getUserById(parseInt(userId));
        if (user) {
          logger.info(`Calling generateUnderwriteRequestContainerName for user ${user.email} (get offer)`);
          containerName = azureBlobService.generateUnderwriteRequestContainerName(
            user.email,
            userId,
            user.first_name,
            user.last_name,
            propertyAddress
          );
          logger.info(`Generated get offer container name for user ${user.email}: ${containerName}`);
        } else {
          // Fallback to original naming if user not found
          containerName = `getoffer-${userId}-${Date.now()}`;
          logger.warn(`User not found for ID ${userId}, using fallback get offer container name: ${containerName}`);
        }
      } catch (error) {
        logger.warn('Could not retrieve user information for get offer container naming, using fallback', { userId, error });
        containerName = `getoffer-${userId}-${Date.now()}`;
      }
    } else {
      logger.info(`Falling through to default container name generation for type: "${cleanType}"`);
      containerName = azureBlobService.generateContainerName(userId.toString(), propertyAddress);
      logger.info(`Generated default container name: ${containerName}`);
    }

    // Check if we're in development mode and if Azure credentials are available
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasAzureCredentials = process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY;
    
    // Use simulation only if in development AND no Azure credentials are available
    const shouldSimulate = isDevelopment && !hasAzureCredentials;

    if (shouldSimulate) {
      // For development without Azure credentials, simulate uploads
      logger.info(`[Development Mode] Simulating upload of ${files.length} ${type || 'property'} images`);
      
      // Create appropriate database record based on type
      if (cleanType === 'underwrite') {
        // For underwrite images in development, just log the action
        // The full record will be created when the underwrite request is submitted
        logger.info(`[Development] Underwrite images simulated: ${files.length} files for user ${userId}`);
      } else if (cleanType === 'getoffer') {
        // For get offer images in development, just log the action
        // The full record will be created when the offer request is submitted
        logger.info(`[Development] Get offer images simulated: ${files.length} files for user ${userId}`);
      } else {
        // For regular property images, create database record
        await createOrUpdatePropertyImage({
          user_id: parseInt(userId),
          property_address: propertyAddress,
          container_name: containerName,
          image_count: files.length
        });
        logger.info(`[Development] Property images simulated: ${files.length} files for user ${userId}`);
      }

      res.status(200).json({
        success: true,
        message: `Successfully simulated ${files.length} ${type || 'property'} images for development`,
        imageCount: files.length,
        isDevelopment: true,
        imageUrls: files.map((file, index) => `http://localhost/dev-image-${index}`), // Mock URLs
      });
      return;
    }

    // For production OR development with Azure credentials, perform actual uploads
    logger.info(`[${isDevelopment ? 'Development' : 'Production'}] Uploading ${files.length} ${type || 'property'} images to Azure Blob Storage`);
    
    // For underwrite and get offer images, use dedicated containers with subfolder structure
    let targetContainerName;
    let subfolder;
    
    if (cleanType === 'underwrite') {
      targetContainerName = 'rehouzd-media';
      // For underwrite, we'll use a temporary subfolder that will be updated when request is created
      subfolder = `underwrite/temp-${userId}-${Date.now()}`;
      logger.info(`Underwrite images: using container "${targetContainerName}" with subfolder "${subfolder}"`);
    } else if (cleanType === 'getoffer') {
      targetContainerName = 'rehouzd-media';
      // For get offer, we'll use a temporary subfolder that will be updated when request is created
      subfolder = `getoffer/temp-${userId}-${Date.now()}`;
      logger.info(`Get offer images: using container "${targetContainerName}" with subfolder "${subfolder}"`);
    } else {
      targetContainerName = containerName;
      subfolder = null;
      logger.info(`Property images: using container "${targetContainerName}"`);
    }
    
    logger.info(`Container name generated: "${containerName}", Target container: "${targetContainerName}"`);
    logger.info(`Subfolder: ${subfolder}`);
    await azureBlobService.createContainerIfNotExists(targetContainerName);

    // Upload each file
    const uploadPromises = files.map(async (file, index) => {
      const fileExtension = path.extname(file.originalname);
      let blobName;
      
      if (cleanType === 'underwrite') {
        // For underwrite images, use original filename (sanitized) in the subfolder
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        blobName = `${subfolder}/${sanitizedFilename}`;
        logger.info(`Generated underwrite blob name with original filename: ${blobName}`);
      } else if (cleanType === 'getoffer') {
        // For get offer images, use original filename (sanitized) in the subfolder
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        blobName = `${subfolder}/${sanitizedFilename}`;
        logger.info(`Generated getoffer blob name with original filename: ${blobName}`);
      } else {
        blobName = `${uuidv4()}${fileExtension}`;
        logger.info(`Generated default blob name: ${blobName}`);
      }
      
      logger.info(`Uploading to container: "${targetContainerName}", blob: "${blobName}"`);
      return azureBlobService.uploadImage(
        targetContainerName,
        blobName,
        file.buffer,
        file.mimetype
      );
    });

    // Wait for all uploads to complete
    const uploadedUrls = await Promise.all(uploadPromises);

    // Update database record for property images (not underwrite and not getoffer)
    // For getoffer, the full record will be created when the offer request is submitted
    if (cleanType !== 'underwrite' && cleanType !== 'getoffer') {
      await createOrUpdatePropertyImage({
        user_id: parseInt(userId),
        property_address: propertyAddress,
        container_name: targetContainerName, // Use the actual container where images are stored
        image_count: files.length,
      });
    }

    logger.info(`Successfully uploaded ${files.length} ${type || 'property'} images to Azure Blob Storage`);

    res.status(200).json({
      success: true,
      message: `${cleanType === 'underwrite' ? 'Underwrite images' : cleanType === 'getoffer' ? 'Get offer images' : 'Property images'} uploaded successfully`,
      imageUrls: uploadedUrls,
      imageCount: files.length,
      containerName: targetContainerName,
      actualContainer: targetContainerName, // Add this for clarity
    });
  } catch (error) {
    logger.error(`Error uploading ${req.body.type || 'property'} images`, { error });
    res.status(500).json({
      success: false,
      message: `Failed to upload ${req.body.type || 'property'} images`,
      error: (error as Error).message,
    });
  }
};

/**
 * Get property images controller
 */
export const getPropertyImageInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, propertyAddress } = req.params;

    // Validate request
    if (!userId || !propertyAddress) {
      res.status(400).json({
        success: false,
        message: 'User ID and property address are required',
      });
      return;
    }

    // Get property images from database
    const propertyImage = await getPropertyImages(parseInt(userId), propertyAddress);

    if (!propertyImage) {
      res.status(404).json({
        success: false,
        message: 'No images found for this property',
      });
      return;
    }

    // Check if we're in development mode and if Azure credentials are available
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasAzureCredentials = process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY;
    const shouldSimulate = isDevelopment && !hasAzureCredentials;

    if (shouldSimulate) {
      res.status(200).json({
        success: true,
        imageCount: propertyImage.image_count,
        isDevelopment: true,
      });
      return;
    }

    // For production OR development with Azure credentials, try to list the blobs in the container
    const blobs = await azureBlobService.listBlobs(propertyImage.container_name);

    res.status(200).json({
      success: true,
      imageCount: propertyImage.image_count,
      blobs,
    });
  } catch (error) {
    logger.error('Error getting property images', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get property images',
      error: (error as Error).message,
    });
  }
};

/**
 * Get count of homes sold in a zip code in the last 12 months
 */
export const getHomesSoldCount = catchAsync(async (req: Request, res: Response) => {
  const { zipCode } = req.params;
  
  if (!zipCode) {
    return res.status(400).json({
      success: false,
      message: 'Zip code is required',
    });
  }
  
  const salesCount = await marketService.getHomesSoldCount(zipCode);
  
  res.status(200).json({
    success: true,
    salesCount,
  });
});

/**
 * Delete a blob from Azure Blob Storage
 */
export const deletePropertyImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { containerName, blobName, userId } = req.body;

    // Validate request
    if (!containerName || !blobName || !userId) {
      res.status(400).json({
        success: false,
        message: 'Container name, blob name, and user ID are required',
      });
      return;
    }

    // Check if we're in development mode and if Azure credentials are available
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasAzureCredentials = process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY;
    const shouldSimulate = isDevelopment && !hasAzureCredentials;

    if (shouldSimulate) {
      logger.info(`[SIMULATION] Would delete blob: ${containerName}/${blobName}`);
      res.status(200).json({
        success: true,
        message: 'Blob deletion simulated (development mode)',
        isDevelopment: true,
      });
      return;
    }

    // Delete the blob from Azure Blob Storage
    await azureBlobService.deleteBlob(containerName, blobName);

    logger.info(`Successfully deleted blob: ${containerName}/${blobName}`);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting property image', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: (error as Error).message,
    });
  }
};

// Export the controllers
export default {
  getPropertyAndMarketData,
  uploadPropertyImages,
  getPropertyImageInfo,
  getHomesSoldCount,
  deletePropertyImage,
  getUserSearchHistory,
  upload,
  validateAddress
}; 