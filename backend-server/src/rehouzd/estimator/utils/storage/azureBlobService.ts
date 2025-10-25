import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential, BlobSASPermissions } from '@azure/storage-blob';
import config from '../../config';
import logger from '../logger';

/**
 * Azure Blob Storage Service for handling property images
 */
class AzureBlobService {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    // Initialize with Azure credentials
    const account = process.env.AZURE_STORAGE_ACCOUNT || 'rehouzedimages';
    const accountKey = process.env.AZURE_STORAGE_KEY || 'L7oiOu3sd49/7lijq+GT05hTK7G5jsBBoK3v0MMoJWccTUJrYbarvTjL/mx/Cc8hHl6MfP0MWBht+AStvSIFCg==';
    
    if (!account || !accountKey) {
      logger.warn('Azure Storage credentials not found. Some features may not work correctly.');
      this.blobServiceClient = {} as BlobServiceClient; // Fallback
      return;
    }
    
    try {
      // Log the account being used (without key for security)
      logger.info(`Initializing Azure Blob Storage with account: ${account}`);
      
      // Create shared key credential
      const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
      
      // Create the BlobServiceClient
      this.blobServiceClient = new BlobServiceClient(
        `https://${account}.blob.core.windows.net`,
        sharedKeyCredential
      );
      
      logger.info(`Azure Blob Storage client initialized successfully with account: ${account}`);
    } catch (error) {
      logger.error('Failed to initialize Azure Blob Storage client', { error });
      this.blobServiceClient = {} as BlobServiceClient; // Fallback
    }
  }

  /**
   * Create a unique container name for a user and property
   */
  public generateContainerName(userId: string, propertyAddress: string): string {
    // Remove special characters and spaces, convert to lowercase
    let containerName = `user${userId}-${propertyAddress.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
    
    // Clean up consecutive dashes
    containerName = containerName.replace(/-+/g, '-');
    
    // Remove any leading or trailing dashes
    containerName = containerName.replace(/^-|-$/g, '');
    
    // Ensure the name is at least 3 characters long
    if (containerName.length < 3) {
      containerName = `container-${containerName}`;
    }
    
    // Truncate if longer than 63 characters
    if (containerName.length > 63) {
      containerName = containerName.substring(0, 63);
      // Ensure it doesn't end with a dash after truncation
      containerName = containerName.replace(/-$/g, '');
    }
    
    logger.info(`Generated container name: ${containerName}`);
    return containerName;
  }

  /**
   * Generate a user-friendly container name for get offer images
   * Uses username+propertyaddress+uniqueid format
   */
  public generateGetOfferContainerName(userEmail?: string, userId?: string, firstName?: string, lastName?: string, propertyAddress?: string): string {
    let username = '';
    
    if (userEmail) {
      // Use email as primary identifier
      username = userEmail.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (firstName && lastName) {
      // Use first and last name as secondary option
      username = `${firstName}-${lastName}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (firstName) {
      // Use just first name if last name not available
      username = firstName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (userId) {
      // Fallback to user ID
      username = `user-${userId}`;
    } else {
      // Ultimate fallback
      username = 'unknown-user';
    }
    
    // Clean up property address
    let cleanPropertyAddress = '';
    if (propertyAddress) {
      cleanPropertyAddress = propertyAddress.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      cleanPropertyAddress = cleanPropertyAddress.replace(/-+/g, '-').replace(/^-|-$/g, '');
    } else {
      cleanPropertyAddress = 'unknown-address';
    }
    
    // Generate a stable ID for uniqueness
    const stableId = this.generateStableId(username, cleanPropertyAddress);
    
    // Create container name with username+propertyaddress+uniqueid format
    let containerName = `${username}-${cleanPropertyAddress}-${stableId}`;
    
    // Ensure the name is at least 3 characters long
    if (containerName.length < 3) {
      containerName = `container-${containerName}`;
    }
    
    // Truncate if longer than 63 characters (Azure container name limit)
    if (containerName.length > 63) {
      // Calculate how much we need to trim
      const maxLength = 63;
      const suffixLength = stableId.length + 1; // +1 for the dash
      const maxUsernameAddressLength = maxLength - suffixLength;
      
      if (maxUsernameAddressLength > 0) {
        const combinedLength = username.length + cleanPropertyAddress.length + 1; // +1 for the dash
        if (combinedLength > maxUsernameAddressLength) {
          // Need to trim both username and address
          const usernameLength = Math.floor(maxUsernameAddressLength / 2);
          const addressLength = maxUsernameAddressLength - usernameLength;
          
          username = username.substring(0, usernameLength);
          cleanPropertyAddress = cleanPropertyAddress.substring(0, addressLength);
        }
        containerName = `${username}-${cleanPropertyAddress}-${stableId}`;
      } else {
        // If even with minimal name it's too long, use a shorter format
        containerName = `go-${stableId}`.substring(0, 63);
      }
    }
    
    logger.info(`Generated get offer container name: ${containerName}`);
    return containerName;
  }

  /**
   * Generate a user-friendly container name for underwrite request images
   * Uses username+propertyaddress+uniqueid format for subfolder within underwriterequestdata container
   */
  public generateUnderwriteRequestContainerName(userEmail?: string, userId?: string, firstName?: string, lastName?: string, propertyAddress?: string): string {
    let username = '';
    
    if (userEmail) {
      // Use email as primary identifier
      username = userEmail.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (firstName && lastName) {
      // Use first and last name as secondary option
      username = `${firstName}-${lastName}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (firstName) {
      // Use just first name if last name not available
      username = firstName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (userId) {
      // Fallback to user ID
      username = `user-${userId}`;
    } else {
      // Ultimate fallback
      username = 'unknown-user';
    }
    
    // Clean up property address
    let cleanPropertyAddress = '';
    if (propertyAddress) {
      cleanPropertyAddress = propertyAddress.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      cleanPropertyAddress = cleanPropertyAddress.replace(/-+/g, '-').replace(/^-|-$/g, '');
    } else {
      cleanPropertyAddress = 'unknown-address';
    }
    
    // Generate a stable ID for uniqueness
    const stableId = this.generateStableId(username, cleanPropertyAddress);
    
    // Create container name with username+propertyaddress+uniqueid format
    let containerName = `${username}-${cleanPropertyAddress}-${stableId}`;
    
    // Ensure the name is at least 3 characters long
    if (containerName.length < 3) {
      containerName = `container-${containerName}`;
    }
    
    // Truncate if longer than 63 characters (Azure container name limit)
    if (containerName.length > 63) {
      // Calculate how much we need to trim
      const maxLength = 63;
      const suffixLength = stableId.length + 1; // +1 for the dash
      const maxUsernameAddressLength = maxLength - suffixLength;
      
      if (maxUsernameAddressLength > 0) {
        const combinedLength = username.length + cleanPropertyAddress.length + 1; // +1 for the dash
        if (combinedLength > maxUsernameAddressLength) {
          // Need to trim both username and address
          const usernameLength = Math.floor(maxUsernameAddressLength / 2);
          const addressLength = maxUsernameAddressLength - usernameLength;
          
          username = username.substring(0, usernameLength);
          cleanPropertyAddress = cleanPropertyAddress.substring(0, addressLength);
        }
        containerName = `${username}-${cleanPropertyAddress}-${stableId}`;
      } else {
        // If even with minimal name it's too long, use a shorter format
        containerName = `uw-${stableId}`.substring(0, 63);
      }
    }
    
    logger.info(`Generated underwrite request container name: ${containerName}`);
    return containerName;
  }

  /**
   * Generate a stable ID based on user and property information
   */
  private generateStableId(username: string, propertyAddress: string): string {
    // Create a simple hash from username and property address
    const combined = `${username}-${propertyAddress}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Generate a user-friendly container name for underwrite images
   * Uses user email or falls back to user ID
   */
  public generateUnderwriteContainerName(userEmail?: string, userId?: string, firstName?: string, lastName?: string): string {
    let baseName = '';
    
    if (userEmail) {
      // Use email as primary identifier
      baseName = userEmail.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (firstName && lastName) {
      // Use first and last name as secondary option
      baseName = `${firstName}-${lastName}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (firstName) {
      // Use just first name if last name not available
      baseName = firstName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    } else if (userId) {
      // Fallback to user ID
      baseName = `user-${userId}`;
    } else {
      // Ultimate fallback
      baseName = 'unknown-user';
    }
    
    // Clean up consecutive dashes and ensure it doesn't start/end with dash
    baseName = baseName.replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Create container name with timestamp for uniqueness
    const timestamp = Date.now();
    let containerName = `underwrite-${baseName}-${timestamp}`;
    
    // Ensure the name is at least 3 characters long
    if (containerName.length < 3) {
      containerName = `container-${containerName}`;
    }
    
    // Truncate if longer than 63 characters (Azure container name limit)
    if (containerName.length > 63) {
      // Calculate how much we need to trim from baseName
      const prefixLength = 'underwrite-'.length;
      const suffixLength = `-${timestamp}`.length;
      const maxBaseLength = 63 - prefixLength - suffixLength;
      
      if (maxBaseLength > 0) {
        baseName = baseName.substring(0, maxBaseLength);
        // Ensure it doesn't end with a dash after truncation
        baseName = baseName.replace(/-$/g, '');
        containerName = `underwrite-${baseName}-${timestamp}`;
      } else {
        // If even with minimal base name it's too long, use a shorter format
        containerName = `uw-${baseName.substring(0, 10)}-${timestamp}`.substring(0, 63);
      }
    }
    
    logger.info(`Generated underwrite container name: ${containerName}`);
    return containerName;
  }

  /**
   * Create a container if it doesn't exist
   */
  public async createContainerIfNotExists(containerName: string): Promise<ContainerClient> {
    try {
      if (!this.blobServiceClient || Object.keys(this.blobServiceClient).length === 0) {
        throw new Error('BlobServiceClient is not properly initialized');
      }
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      // Create the container if it doesn't exist (private access since public access is not permitted)
      const createContainerResponse = await containerClient.createIfNotExists();
      
      if (createContainerResponse.succeeded) {
        logger.info(`Container "${containerName}" created successfully`);
      } else {
        logger.info(`Container "${containerName}" already exists`);
      }
      
      return containerClient;
    } catch (error) {
      logger.error('Error creating container', { error, containerName });
      throw error;
    }
  }

  /**
   * Upload an image to Azure Blob Storage
   */
  public async uploadImage(
    containerName: string,
    blobName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      if (!this.blobServiceClient || Object.keys(this.blobServiceClient).length === 0) {
        throw new Error('BlobServiceClient is not properly initialized');
      }
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Upload the file
      const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });
      
      logger.info(`Blob "${blobName}" uploaded successfully to container "${containerName}"`);
      
      // Generate SAS URL for private access
      const sasUrl = await this.generateSasUrl(containerName, blobName);
      return sasUrl;
    } catch (error) {
      logger.error('Error uploading blob', { error, containerName, blobName });
      throw error;
    }
  }

  /**
   * Generate a SAS URL for a blob
   */
  public async generateSasUrl(containerName: string, blobName: string): Promise<string> {
    try {
      if (!this.blobServiceClient || Object.keys(this.blobServiceClient).length === 0) {
        throw new Error('BlobServiceClient is not properly initialized');
      }
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Generate SAS token with read permissions for 1 year
      const permissions = new BlobSASPermissions();
      permissions.read = true;
      
      const sasToken = await blockBlobClient.generateSasUrl({
        permissions,
        expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      });
      
      logger.info(`Generated SAS URL for blob "${blobName}" in container "${containerName}"`);
      return sasToken;
    } catch (error) {
      logger.error('Error generating SAS URL', { error, containerName, blobName });
      throw error;
    }
  }

  /**
   * List all blobs in a container
   */
  public async listBlobs(containerName: string): Promise<string[]> {
    try {
      if (!this.blobServiceClient || Object.keys(this.blobServiceClient).length === 0) {
        throw new Error('BlobServiceClient is not properly initialized');
      }
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobs: string[] = [];
      
      // List all blobs in the container
      for await (const blob of containerClient.listBlobsFlat()) {
        blobs.push(blob.name);
      }
      
      return blobs;
    } catch (error) {
      logger.error('Error listing blobs', { error, containerName });
      throw error;
    }
  }

  /**
   * Delete a blob from a container
   */
  public async deleteBlob(containerName: string, blobName: string): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.delete();
      logger.info(`Blob "${blobName}" deleted successfully from container "${containerName}"`);
    } catch (error) {
      logger.error('Error deleting blob', { error, containerName, blobName });
      throw error;
    }
  }

  /**
   * Alternative method to ensure a container exists - uses a different approach
   * This can be used as a fallback if the standard method fails
   */
  public async ensureContainerExistsAlternative(containerName: string): Promise<ContainerClient> {
    try {
      if (!this.blobServiceClient || Object.keys(this.blobServiceClient).length === 0) {
        throw new Error('BlobServiceClient is not properly initialized');
      }
      
      // Get container client for the specified container
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      // Check if container exists
      const exists = await containerClient.exists();
      
      if (!exists) {
        try {
          // Create container with private access since public access is not permitted
          await this.blobServiceClient.createContainer(containerName);
        } catch (createError) {
          // If creation failed, check again if it exists (race condition)
          const checkAgain = await containerClient.exists();
          if (!checkAgain) {
            throw createError;
          }
        }
      }
      
      return containerClient;
    } catch (error) {
      logger.error('Error ensuring container exists (alternative method)', { error, containerName });
      throw error;
    }
  }

  /**
   * Upload an image with alternative container creation method
   * Use this if the regular uploadImage method fails
   */
  public async uploadImageAlternative(
    containerName: string,
    blobName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      // Use the alternative container creation method
      const containerClient = await this.ensureContainerExistsAlternative(containerName);
      
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Upload the file
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });
      
      return blockBlobClient.url;
    } catch (error) {
      logger.error('Error uploading blob (alternative method)', { error, containerName, blobName });
      throw error;
    }
  }

  /**
   * Move blobs from temp subfolder to final subfolder
   * Used when underwrite/get offer requests are created
   */
  public async moveBlobsFromTempToFinal(
    containerName: string,
    tempSubfolder: string,
    finalSubfolder: string,
    imagesData: any[]
  ): Promise<{ success: boolean; updatedImagesData: any[]; error?: string }> {
    try {
      if (!this.blobServiceClient || Object.keys(this.blobServiceClient).length === 0) {
        throw new Error('BlobServiceClient is not properly initialized');
      }

      logger.info(`Moving blobs from temp subfolder "${tempSubfolder}" to final subfolder "${finalSubfolder}" in container "${containerName}"`);
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const updatedImagesData = [...imagesData];
      
      // Process each image in the images_data array
      for (let i = 0; i < updatedImagesData.length; i++) {
        const image = updatedImagesData[i];
        
        if (image.url && image.url.includes(tempSubfolder)) {
          try {
            // Extract the filename from the current URL
            const urlParts = image.url.split('/');
            const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove SAS token
            
            const sourceBlobName = `${tempSubfolder}/${filename}`;
            const targetBlobName = `${finalSubfolder}/${filename}`;
            
            logger.info(`Moving blob from "${sourceBlobName}" to "${targetBlobName}"`);
            
            // Get source and target blob clients
            const sourceBlobClient = containerClient.getBlockBlobClient(sourceBlobName);
            const targetBlobClient = containerClient.getBlockBlobClient(targetBlobName);
            
            // Check if source blob exists
            const sourceExists = await sourceBlobClient.exists();
            if (!sourceExists) {
              logger.warn(`Source blob "${sourceBlobName}" does not exist, skipping`);
              continue;
            }
            
            // Copy blob to new location
            const copyResponse = await targetBlobClient.beginCopyFromURL(sourceBlobClient.url);
            await copyResponse.pollUntilDone();
            
            // Delete the original blob
            await sourceBlobClient.delete();
            
            // Generate new SAS URL for the moved blob
            const newSasUrl = await this.generateSasUrl(containerName, targetBlobName);
            
            // Update the image data with new URL
            updatedImagesData[i] = {
              ...image,
              url: newSasUrl
            };
            
            logger.info(`Successfully moved blob "${sourceBlobName}" to "${targetBlobName}"`);
            
          } catch (moveError) {
            logger.error(`Error moving blob for image ${i}:`, moveError);
            // Continue with other images even if one fails
          }
        }
      }
      
      // Try to clean up the temp subfolder if it's empty
      try {
        await this.cleanupEmptySubfolder(containerName, tempSubfolder);
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup temp subfolder "${tempSubfolder}":`, cleanupError);
        // Don't fail the entire operation if cleanup fails
      }
      
      logger.info(`Successfully moved ${updatedImagesData.length} blobs from temp to final subfolder`);
      
      return {
        success: true,
        updatedImagesData
      };
      
    } catch (error) {
      logger.error('Error moving blobs from temp to final subfolder:', error);
      return {
        success: false,
        updatedImagesData: imagesData, // Return original data on error
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Move blobs from multiple temp subfolders to final subfolder
   * Used when underwrite/get offer requests are created with multiple upload sessions
   */
  public async moveBlobsFromMultipleTempToFinal(
    containerName: string,
    finalSubfolder: string,
    imagesData: any[]
  ): Promise<{ success: boolean; updatedImagesData: any[]; error?: string }> {
    try {
      if (!this.blobServiceClient || Object.keys(this.blobServiceClient).length === 0) {
        throw new Error('BlobServiceClient is not properly initialized');
      }

      logger.info(`Moving blobs from multiple temp subfolders to final subfolder "${finalSubfolder}" in container "${containerName}"`);
      
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const updatedImagesData = [...imagesData];
      const processedTempSubfolders = new Set<string>();
      
      // Process each image in the images_data array
      for (let i = 0; i < updatedImagesData.length; i++) {
        const image = updatedImagesData[i];
        
        if (image.url && typeof image.url === 'string') {
          try {
            // Extract temp subfolder from URL
            const tempSubfolderMatch = image.url.match(/underwrite\/temp-\d+-\d+|getoffer\/temp-\d+-\d+/);
            
            if (tempSubfolderMatch) {
              const tempSubfolder = tempSubfolderMatch[0];
              processedTempSubfolders.add(tempSubfolder);
              
              // Extract the filename from the current URL
              const urlParts = image.url.split('/');
              const filename = urlParts[urlParts.length - 1].split('?')[0]; // Remove SAS token
              
              const sourceBlobName = `${tempSubfolder}/${filename}`;
              const targetBlobName = `${finalSubfolder}/${filename}`;
              
              logger.info(`Moving blob from "${sourceBlobName}" to "${targetBlobName}"`);
              
              // Get source and target blob clients
              const sourceBlobClient = containerClient.getBlockBlobClient(sourceBlobName);
              const targetBlobClient = containerClient.getBlockBlobClient(targetBlobName);
              
              // Check if source blob exists
              const sourceExists = await sourceBlobClient.exists();
              if (!sourceExists) {
                logger.warn(`Source blob "${sourceBlobName}" does not exist, skipping`);
                continue;
              }
              
              // Copy blob to new location
              const copyResponse = await targetBlobClient.beginCopyFromURL(sourceBlobClient.url);
              await copyResponse.pollUntilDone();
              
              // Delete the original blob
              await sourceBlobClient.delete();
              
              // Generate new SAS URL for the moved blob
              const newSasUrl = await this.generateSasUrl(containerName, targetBlobName);
              
              // Update the image data with new URL
              updatedImagesData[i] = {
                ...image,
                url: newSasUrl
              };
              
              logger.info(`Successfully moved blob "${sourceBlobName}" to "${targetBlobName}"`);
              
            } else {
              logger.warn(`No temp subfolder found in URL for image ${i}: ${image.url}`);
            }
            
          } catch (moveError) {
            logger.error(`Error moving blob for image ${i}:`, moveError);
            // Continue with other images even if one fails
          }
        }
      }
      
      // Clean up all processed temp subfolders
      for (const tempSubfolder of processedTempSubfolders) {
        try {
          await this.cleanupEmptySubfolder(containerName, tempSubfolder);
        } catch (cleanupError) {
          logger.warn(`Failed to cleanup temp subfolder "${tempSubfolder}":`, cleanupError);
          // Don't fail the entire operation if cleanup fails
        }
      }
      
      logger.info(`Successfully moved ${updatedImagesData.length} blobs from ${processedTempSubfolders.size} temp subfolders to final subfolder`);
      
      return {
        success: true,
        updatedImagesData
      };
      
    } catch (error) {
      logger.error('Error moving blobs from multiple temp subfolders to final subfolder:', error);
      return {
        success: false,
        updatedImagesData: imagesData, // Return original data on error
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Clean up empty subfolder after moving blobs
   */
  private async cleanupEmptySubfolder(containerName: string, subfolder: string): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      // List all blobs in the subfolder
      const blobs: string[] = [];
      for await (const blob of containerClient.listBlobsFlat({ prefix: subfolder })) {
        blobs.push(blob.name);
      }
      
      // If no blobs found in subfolder, it's already empty
      if (blobs.length === 0) {
        logger.info(`Subfolder "${subfolder}" is already empty, no cleanup needed`);
        return;
      }
      
      logger.info(`Found ${blobs.length} remaining blobs in subfolder "${subfolder}", skipping cleanup`);
      
    } catch (error) {
      logger.error(`Error checking subfolder "${subfolder}" for cleanup:`, error);
      throw error;
    }
  }

  /**
   * Extract temp subfolder information from uploaded URLs
   * Used to determine the source subfolder when moving blobs
   */
  public extractTempSubfolderFromUrls(imagesData: any[], type: 'underwrite' | 'getoffer'): string | null {
    if (!imagesData || imagesData.length === 0) {
      return null;
    }

    // Find the first image with a URL that contains the temp subfolder pattern
    for (const image of imagesData) {
      if (image.url && typeof image.url === 'string') {
        // Look for patterns like:
        // - underwrite/temp-123-1234567890/filename.jpg
        // - getoffer/temp-123-1234567890/filename.jpg
        const tempPattern = new RegExp(`${type}/temp-\\d+-\\d+`);
        const match = image.url.match(tempPattern);
        
        if (match) {
          return match[0]; // Return the full temp subfolder path
        }
      }
    }

    return null;
  }
}

export default new AzureBlobService(); 