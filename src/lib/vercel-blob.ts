import { list } from '@vercel/blob';

/**
 * Blob file metadata
 */
export interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  downloadUrl: string;
}

/**
 * List all files from Vercel Blob storage under a specific prefix
 * Filters out folders/directories and only returns actual files
 * 
 * @param prefix - The folder prefix to search (e.g., 'transcripts/')
 * @returns Array of blob files (excluding folders)
 */
export async function listBlobFiles(prefix: string = 'transcripts/'): Promise<BlobFile[]> {
  try {
    const { blobs } = await list({
      prefix,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Filter out folders - only include actual files
    const files = blobs.filter(blob => {
      // Exclude if pathname ends with '/' (folder marker)
      if (blob.pathname.endsWith('/')) {
        console.log(`⏭️  Skipping folder: ${blob.pathname}`);
        return false;
      }
      
      // Exclude if size is 0 and pathname looks like a folder
      if (blob.size === 0 && !blob.pathname.includes('.')) {
        console.log(`⏭️  Skipping empty folder: ${blob.pathname}`);
        return false;
      }
      
      return true;
    });

    console.log(`📁 Found ${files.length} files (filtered out ${blobs.length - files.length} folders)`);

    return files.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      downloadUrl: blob.downloadUrl,
    }));
  } catch (error) {
    console.error('Error listing blob files:', error);
    throw new Error(`Failed to list blob files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download file content from Vercel Blob
 * 
 * @param url - The blob URL
 * @returns File content as text
 */
export async function downloadBlobFile(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error downloading blob file:', error);
    throw new Error(`Failed to download blob file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

