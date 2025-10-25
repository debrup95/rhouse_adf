import { OAuth2Client } from 'google-auth-library';

class GooglePhotosService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }

  async uploadImage(imageBuffer: Buffer, filename: string, accessToken: string): Promise<string> {
    try {
      // Set the access token
      this.oauth2Client.setCredentials({ access_token: accessToken });

      // Upload the bytes first
      const uploadToken = await this.uploadBytes(imageBuffer, accessToken);

      // Create the media item using the upload token
      const mediaItem = await this.createMediaItem(uploadToken, filename, accessToken);

      // Return the media item URL
      return mediaItem?.baseUrl || '';
    } catch (error) {
      console.error('Error uploading to Google Photos:', error);
      throw error;
    }
  }

  private async uploadBytes(imageBuffer: Buffer, accessToken: string): Promise<string> {
    try {
      const response = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
          'X-Goog-Upload-Content-Type': 'image/jpeg',
          'X-Goog-Upload-Protocol': 'raw'
        },
        body: imageBuffer
      });

      if (!response.ok) {
        throw new Error(`Failed to upload bytes: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error uploading bytes:', error);
      throw error;
    }
  }

  private async createMediaItem(uploadToken: string, filename: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newMediaItems: [{
            description: filename,
            simpleMediaItem: {
              uploadToken: uploadToken,
              fileName: filename
            }
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create media item: ${response.statusText}`);
      }

      const result = await response.json();
      return result.newMediaItemResults?.[0]?.mediaItem;
    } catch (error) {
      console.error('Error creating media item:', error);
      throw error;
    }
  }
}

export const googlePhotosService = new GooglePhotosService(); 