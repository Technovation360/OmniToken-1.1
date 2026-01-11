/**
 * Backblaze B2 Storage Service
 * Cluster: us-east-005
 */

const B2_CONFIG = {
  keyID: '0053f463a9219780000000003',
  applicationKey: 'K0050Qpqcm0Fku+9jvxVEyrO7wPg3TY',
  // Cluster specific endpoints
  authEndpoint: 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
  bucketName: 'omnitech-ads'
};

interface B2AuthResponse {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

interface B2UploadUrlResponse {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
}

/**
 * Uploads a file to Backblaze B2 using the Native API.
 * NOTE: B2 Native API requires CORS to be configured on the bucket.
 * Authorization (b2_authorize_account) is usually blocked by B2's CORS policy in browsers.
 * If 'Failed to fetch' occurs, it's likely a CORS restriction or invalid keys.
 */
export const uploadVideoToB2 = async (
  file: File, 
  onProgress?: (percent: number) => void
): Promise<string> => {
  try {
    // 1. Authorize Account
    // Using the global auth endpoint which identifies cluster from keyID
    const authHeader = btoa(`${B2_CONFIG.keyID}:${B2_CONFIG.applicationKey}`);
    
    const authRes = await fetch(B2_CONFIG.authEndpoint, {
      method: 'GET',
      headers: { 
        'Authorization': `Basic ${authHeader}`,
        'Accept': 'application/json'
      }
    }).catch(err => {
      throw new Error(`Connection blocked. This usually happens because Backblaze B2 API does not allow CORS for authorization requests directly from a browser. Error: ${err.message}`);
    });
    
    if (!authRes.ok) {
      const errorData = await authRes.json().catch(() => ({}));
      throw new Error(`B2 Auth Failed (${authRes.status}): ${errorData.message || 'Unknown error'}`);
    }
    
    const authData: B2AuthResponse = await authRes.json();

    // 2. Find Bucket
    // We list buckets to get the internal bucketId for the provided bucketName
    const listBucketsRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_buckets?accountId=${authData.accountId}`, {
      headers: { 'Authorization': authData.authorizationToken }
    });
    
    if (!listBucketsRes.ok) throw new Error('Failed to list B2 buckets');
    
    const { buckets } = await listBucketsRes.json();
    // Try to find the specific bucket, or fallback to the first one available to this key
    const bucket = buckets.find((b: any) => b.bucketName === B2_CONFIG.bucketName) || buckets[0];
    
    if (!bucket) throw new Error(`No buckets found for this B2 account key.`);

    // 3. Get Upload URL
    const uploadUrlRes = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_url?bucketId=${bucket.bucketId}`, {
      headers: { 'Authorization': authData.authorizationToken }
    });
    
    if (!uploadUrlRes.ok) throw new Error('Failed to get B2 upload URL');
    const uploadData: B2UploadUrlResponse = await uploadUrlRes.json();

    // 4. Upload File via XHR
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadData.uploadUrl, true);
      
      xhr.setRequestHeader('Authorization', uploadData.authorizationToken);
      xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name));
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.setRequestHeader('X-Bz-Content-Sha1', 'do_not_verify');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          // Construct public download URL based on the cluster provided (f005 for us-east-005)
          const downloadUrl = `${authData.downloadUrl}/file/${bucket.bucketName}/${response.fileName}`;
          resolve(downloadUrl);
        } else {
          const err = JSON.parse(xhr.responseText || '{}');
          reject(new Error(`Upload failed (${xhr.status}): ${err.message || 'Server error'}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during B2 file upload. Ensure CORS is enabled on the B2 bucket settings.'));
      xhr.send(file);
    });
  } catch (error: any) {
    console.error('B2 Service Critical Error:', error);
    throw error;
  }
};
