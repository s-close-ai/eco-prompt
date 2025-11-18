/**
 * 파일 업로드 관련 타입 정의
 */

// Presigned URL 요청
export interface FilePresignedUrlRequest {
  filename: string;
  contentType: string;
}

// Presigned URL 응답
export interface FilePresignedUrlResponse {
  status: string;
  data: {
    urls: {
      uploadUrl: string;
      fileUrl: string;
    };
    fileId: number; // 백엔드에서 생성한 파일 ID
  };
}

// 업로드된 파일 정보
export interface UploadedFileInfo {
  fileUrl: string;
  filename: string;
  fileId: number;
  contentType?: string;
  thumbnailUrl?: string; // 이미지의 경우 썸네일 URL
}

// 메시지에 포함되는 파일 정보
export interface MessageFileAttachment {
  fileId: number;
  filename: string;
  fileUrl: string;
  contentType: string;
  size?: number;
}
