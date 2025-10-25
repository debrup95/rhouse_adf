import { API_BASE_URL } from './apiService';

/**
 * Service for handling Google Photos operations
 * Including downloading photos and uploading them to Azure Blob storage
 */
export interface GooglePhotoRef {
  url: string;
  id: string;
  filename: string;
}

/**
 * Upload Google Photos to Azure Blob storage
 * @param photos Array of Google photos references
 * @param propertyId ID of the property the photos belong to
 * @param propertyAddress Address of the property
 * @param userId User ID
 * @returns Promise with upload results
 */
export const uploadGooglePhotosToAzure = async (
  photos: GooglePhotoRef[],
  propertyId: string,
  propertyAddress: string,
  userId?: string | number
): Promise<{ 
  success: boolean; 
  count: number; 
  azureUrls?: string[];
  error?: string;
}> => {
  try {
    if (!photos || photos.length === 0) {
      return { success: false, count: 0, error: 'No photos provided' };
    }

    // Create the request body
    const requestBody = {
      googlePhotos: photos,
      propertyId,
      propertyAddress,
      userId: userId ? String(userId) : undefined
    };

    // Make the API request to the backend endpoint that will handle the download and upload
    const response = await fetch(`${API_BASE_URL}/api/property/google-photos/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = 'Failed to upload Google Photos to Azure';
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If we can't parse the response as JSON, use the default error message
      }
      
      return { 
        success: false, 
        count: 0, 
        error: errorMessage 
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      count: photos.length,
      azureUrls: data.urls || []
    };
  } catch (error) {
    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

export default {
  uploadGooglePhotosToAzure
}; 