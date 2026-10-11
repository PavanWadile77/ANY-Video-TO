import { auth } from './firebase.js';
import { BUCKET_AI_VIDEOS, BUCKET_VIDEO_THUMBNAILS, DEFAULT_SUPABASE_URL } from './supabase.js';

export interface StorageUploadResponse {
  success: boolean;
  bucket: string;
  path: string;
  signedUrl: string;
  expiresIn: number;
  sizeBytes: number;
  mimeType: string;
  filename: string;
}

export interface StorageState<T> {
  data: T | null;
  isLoading: boolean;
  progress: number;
  error: string | null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const currentUser = auth.currentUser;

  if (currentUser) {
    headers['x-user-id'] = currentUser.uid;
    try {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Fallback to user ID header
    }
  }

  return headers;
}

export const supabaseStorageService = {
  /**
   * Upload source image or video clip with progress tracking
   * Scoped to user's private folder in 'ai-videos'
   */
  async uploadSourceMedia(
    file: File,
    onProgress?: (progressPercent: number) => void
  ): Promise<StorageUploadResponse> {
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeBytes) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed is 50MB.`);
    }

    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/storage/upload/source');

      Object.entries(authHeaders).forEach(([k, v]) => {
        xhr.setRequestHeader(k, v);
      });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              bucket: res.bucket || BUCKET_AI_VIDEOS,
              path: res.path,
              signedUrl: res.signedUrl,
              expiresIn: res.expiresIn || 3600,
              sizeBytes: res.sizeBytes || file.size,
              mimeType: res.mimeType || file.type,
              filename: file.name
            });
          } catch (e) {
            reject(new Error('Invalid response from storage service'));
          }
        } else {
          let errorMsg = `Upload failed with HTTP ${xhr.status}`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            errorMsg = errJson.error || errorMsg;
          } catch {
            // ignore
          }
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload. Check your connection.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Upload thumbnail image with progress tracking
   * Scoped to user's private folder in 'video-thumbnails'
   */
  async uploadThumbnail(
    file: File,
    onProgress?: (progressPercent: number) => void
  ): Promise<StorageUploadResponse> {
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeBytes) {
      throw new Error(`Thumbnail too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed is 10MB.`);
    }

    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/storage/upload/thumbnail');

      Object.entries(authHeaders).forEach(([k, v]) => {
        xhr.setRequestHeader(k, v);
      });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              bucket: res.bucket || BUCKET_VIDEO_THUMBNAILS,
              path: res.path,
              signedUrl: res.signedUrl,
              expiresIn: res.expiresIn || 3600,
              sizeBytes: res.sizeBytes || file.size,
              mimeType: res.mimeType || file.type,
              filename: file.name
            });
          } catch {
            reject(new Error('Failed to parse thumbnail upload response'));
          }
        } else {
          let errorMsg = `Thumbnail upload failed (${xhr.status})`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            errorMsg = errJson.error || errorMsg;
          } catch {
            // ignore
          }
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during thumbnail upload'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Request a short-lived signed URL for private video or thumbnail playback
   */
  async getSignedPlaybackUrl(
    bucket: string,
    storagePath: string,
    expiresIn = 3600
  ): Promise<string> {
    const authHeaders = await getAuthHeaders();
    const response = await fetch('/api/storage/signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ bucket, path: storagePath, expiresIn })
    });

    if (!response.ok) {
      let errMsg = `Failed to get signed playback URL (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        errMsg = errJson.error || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.signedUrl;
  },

  /**
   * Check Supabase Storage backend connectivity status
   */
  async getStatus() {
    try {
      const res = await fetch('/api/storage/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return {
      isConfigured: false,
      projectRef: 'tboopdrzolsjfdanmqww',
      url: DEFAULT_SUPABASE_URL,
      buckets: { videos: BUCKET_AI_VIDEOS, thumbnails: BUCKET_VIDEO_THUMBNAILS }
    };
  }
};
