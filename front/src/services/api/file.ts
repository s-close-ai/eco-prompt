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
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 진행률 이벤트
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    // 완료 이벤트
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        console.error('S3 업로드 실패:', xhr.status, xhr.responseText);
        reject(new Error(`S3 업로드 실패: ${xhr.status}`));
      }
    });

    // 에러 이벤트
    xhr.addEventListener('error', () => {
      reject(new Error('네트워크 오류로 업로드 실패'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
};

/**
 * 파일 업로드 전체 프로세스
 * 1. Presigned URL 요청
 * 2. S3에 업로드
 * 3. 업로드된 파일 정보 반환
 */
export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadedFileInfo> => {
  try {
    // Content-Type 정규화 (빈 값이면 기본값 사용)
    let contentType = file.type || 'application/octet-stream';

    // txt 파일인 경우 UTF-8 인코딩 명시
    if (contentType === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      contentType = 'text/plain; charset=utf-8';
    }

    // Step 1: Presigned URL 요청
    const presignedResponse = await getPresignedUrl({
      originalFileName: file.name,
      contentType: contentType,
    });

    const { uploadUrl, fileId, savedFileName } = presignedResponse.data;

    // Step 2: S3에 업로드 (presigned URL 생성 시 사용한 동일한 contentType 사용)
    await uploadToS3(uploadUrl, file, contentType, onProgress);

    // Step 3: 최종 파일 URL 생성 (presigned URL에서 query string 제거)
    const finalFileUrl = uploadUrl.split('?')[0];

    // Step 4: 모든 파일에 대해 로컬 Blob URL 생성 (즉시 확인 가능하도록)
    const localPreviewUrl = URL.createObjectURL(file);

    // Step 5: 업로드된 파일 정보 반환
    return {
      fileUrl: finalFileUrl, // 최종 URL 반환
      filename: file.name,
      fileId,
      contentType: contentType,
      thumbnailUrl: localPreviewUrl, // 모든 파일의 로컬 미리보기용 Blob URL
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
