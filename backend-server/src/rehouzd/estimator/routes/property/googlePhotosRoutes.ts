import express, { Request, Response, Router } from 'express';
import axios from 'axios';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router: Router = express.Router();

interface GooglePhoto {
  url: string;
  filename?: string;
}

interface UploadRequestBody {
  googlePhotos: GooglePhoto[];
  propertyId?: string;
  propertyAddress?: string;
  userId?: string;
}

// Azure Blob Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || 'property-images';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.error('Azure Storage Connection String is not set');
}

/**
 * Route to download Google Photos and upload them to Azure Blob storage
 * POST /api/property/google-photos/upload
 */
router.post('/upload', async (req: Request<{}, any, UploadRequestBody>, res: Response): Promise<void> => {
  try {
    const { googlePhotos, propertyId, propertyAddress, userId } = req.body;

    if (!googlePhotos || !Array.isArray(googlePhotos) || googlePhotos.length === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'No Google Photos provided' 
      });
      return;
    }

    console.log(`Received request to upload ${googlePhotos.length} Google Photos for property ${propertyId}`);

    // Create a unique folder name for this property's photos
    const safePropertyId = propertyId ? 
      propertyId.replace(/[^a-zA-Z0-9]/g, '') : 
      `unknown-${Date.now()}`;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `${safePropertyId}-${timestamp}`;

    // Initialize Azure Blob Storage client
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );
    
    // Get a reference to the container
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Create the container if it doesn't exist
    await containerClient.createIfNotExists();

    // Create a temporary directory for downloading images
    const tempDir = path.join(os.tmpdir(), `google-photos-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    console.log(`Created temporary directory for downloads: ${tempDir}`);

    // Array to store the Azure URLs of uploaded photos
    const azureUrls: string[] = [];

    // Process each Google Photo
    for (let i = 0; i < googlePhotos.length; i++) {
      const photo = googlePhotos[i];
      
      try {
        // Create a unique blob name
        const safeFilename = photo.filename ? 
          photo.filename.replace(/[^a-zA-Z0-9.]/g, '_') : 
          `photo-${i}.jpg`;
          
        const blobName = `${folderName}/${safeFilename}`;
        
        // Append the correct size parameter for full-size image
        // Google Photos URLs need a size parameter to determine the image dimensions
        const downloadUrl = photo.url.includes('=') ? 
          `${photo.url.split('=')[0]}=d` : // 'd' means download (original size)
          `${photo.url}=d`;
        
        console.log(`Downloading photo ${i+1}/${googlePhotos.length}: ${downloadUrl}`);
        
        // Download the image
        const response = await axios({
          method: 'GET',
          url: downloadUrl,
          responseType: 'arraybuffer'
        });
        
        // Get a reference to the blob
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Upload the image data to Azure Blob storage
        await blockBlobClient.upload(
          response.data,
          response.data.length,
          {
            blobHTTPHeaders: {
              blobContentType: 'image/jpeg' // Assuming JPEG format
            }
          }
        );
        
        // Get the URL for the uploaded blob
        const azureUrl = blockBlobClient.url;
        azureUrls.push(azureUrl);
        
        console.log(`Successfully uploaded photo ${i+1} to Azure: ${azureUrl}`);
      } catch (photoError) {
        console.error(`Error processing photo ${i+1}:`, photoError);
        // Continue with the next photo
      }
    }

    // Clean up the temporary directory
    try {
      fs.rmdirSync(tempDir, { recursive: true });
    } catch (cleanupError) {
      console.error('Error cleaning up temporary directory:', cleanupError);
    }

    // Return the results
    res.status(200).json({
      success: true,
      count: azureUrls.length,
      total: googlePhotos.length,
      urls: azureUrls
    });
    return;
  } catch (error) {
    console.error('Error uploading Google Photos to Azure:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading Google Photos to Azure',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export default router; 