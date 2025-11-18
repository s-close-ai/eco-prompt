import { apiClient } from '@/services/axios';
import type {
  FilePresignedUrlRequest,
  FilePresignedUrlResponse,
  UploadedFileInfo,
} from '@/types/api/file.types';

/**
 * Presigned URL 요청
 * TODO: 백엔드 API 엔드포인트 확인 필요
 * Endpoint: POST /files/presigned (예상)
 */
export const getPresignedUrl = async (
  request: FilePresignedUrlRequest,
): Promise<FilePresignedUrlResponse> => {
  // TODO: 실제 API 엔드포인트로 변경 필요
  const response = await apiClient.post<FilePresignedUrlResponse>(
    '/files/presigned',
    request,
  );
  return response.data;
};

/**
 * S3에 파일 업로드
 * presigned URL을 사용하여 직접 S3에 업로드
 */
export const uploadToS3 = async (uploadUrl: string, file: File): Promise<void> => {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
};

/**
 * 파일 업로드 전체 프로세스
 * 1. Presigned URL 요청
 * 2. S3에 업로드
 * 3. 업로드된 파일 정보 반환
 */
export const uploadFile = async (file: File): Promise<UploadedFileInfo> => {
  try {
    // Step 1: Presigned URL 요청
    // TODO: API 준비되면 주석 해제
    /*
    const presignedResponse = await getPresignedUrl({
      filename: file.name,
      contentType: file.type,
    });

    const { uploadUrl, fileUrl } = presignedResponse.data.urls;
    const { fileId } = presignedResponse.data;

    // Step 2: S3에 업로드
    await uploadToS3(uploadUrl, file);

    // Step 3: 업로드된 파일 정보 반환
    return {
      fileUrl,
      filename: file.name,
      fileId,
      contentType: file.type,
    };
    */

    // TODO: 임시 구현 - API 준비되면 삭제
    // 로컬에서 파일을 미리보기용 URL로 변환
    const objectUrl = URL.createObjectURL(file);
    return {
      fileUrl: objectUrl,
      filename: file.name,
      fileId: Date.now(), // 임시 ID
      contentType: file.type,
      thumbnailUrl: file.type.startsWith('image/') ? objectUrl : undefined,
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
