import { apiClient } from '@/services/axios';
import type {
  FilePresignedUrlRequest,
  FilePresignedUrlResponse,
  UploadedFileInfo,
} from '@/types/api/file.types';

/**
 * Presigned URL 요청
 * Endpoint: POST /messages/file-upload
 * Query parameters: originalFileName, contentType
 */
export const getPresignedUrl = async (
  request: FilePresignedUrlRequest,
): Promise<FilePresignedUrlResponse> => {
  const response = await apiClient.post<FilePresignedUrlResponse>(
    '/messages/file-upload',
    null,
    {
      params: {
        originalFileName: request.originalFileName,
        contentType: request.contentType,
      },
    },
  );
  return response.data;
};

/**
 * S3에 파일 업로드
 * presigned URL을 사용하여 직접 S3에 업로드
 */
export const uploadToS3 = async (
  uploadUrl: string,
  file: File,
  contentType: string
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('S3 업로드 실패:', response.status, errorText);
    throw new Error(`S3 업로드 실패: ${response.status}`);
  }
};

/**
 * 파일 업로드 전체 프로세스
 * 1. Presigned URL 요청
 * 2. S3에 업로드
 * 3. 업로드된 파일 정보 반환
 */
export const uploadFile = async (file: File): Promise<UploadedFileInfo> => {
  try {
    // Content-Type 정규화 (빈 값이면 기본값 사용)
    const contentType = file.type || 'application/octet-stream';

    // 이미지인 경우 로컬 미리보기용 Blob URL 생성 (CORS 문제 회피)
    const localBlobUrl = contentType.startsWith('image/') ? URL.createObjectURL(file) : undefined;

    // Step 1: Presigned URL 요청
    const presignedResponse = await getPresignedUrl({
      originalFileName: file.name,
      contentType: contentType,
    });

    const { uploadUrl, fileId } = presignedResponse.data;

    // Step 2: S3에 업로드 (presigned URL 생성 시 사용한 동일한 contentType 사용)
    await uploadToS3(uploadUrl, file, contentType);

    // Step 3: S3 URL 생성 (uploadUrl에서 query string 제거)
    const s3Url = uploadUrl.split('?')[0];

    // Step 4: 업로드된 파일 정보 반환
    return {
      fileUrl: s3Url,
      filename: file.name,
      fileId,
      contentType: contentType,
      thumbnailUrl: localBlobUrl, // 로컬 Blob URL 사용 (미리보기용)
    };
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    throw new Error('파일 업로드에 실패했습니다.');
  }
};

/**
 * 여러 파일 업로드
 */
export const uploadFiles = async (files: File[]): Promise<UploadedFileInfo[]> => {
  const uploadPromises = files.map((file) => uploadFile(file));
  return Promise.all(uploadPromises);
};
