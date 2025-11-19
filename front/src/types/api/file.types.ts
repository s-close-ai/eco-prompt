/**
 * 파일 업로드 관련 타입 정의
 */

// Presigned URL 요청
export interface FilePresignedUrlRequest {
  originalFileName: string;
  contentType: string;
}

// Presigned URL 응답
export interface FilePresignedUrlResponse {
  status: string;
  data: {
    uploadUrl: string;
    savedFileName: string;
    fileId: number; // 백엔드에서 생성한 파일 ID
  };
}

// 업로드된 파일 정보 (프론트엔드에서 사용)
export interface UploadedFileInfo {
  fileUrl: string; // S3 URL (업로드 후)
  filename: string; // 원본 파일명
  fileId: number;
  contentType?: string;
  thumbnailUrl?: string; // 이미지의 경우 썸네일 URL (로컬 미리보기용)
}

// 메시지에 포함되는 파일 정보 (API 요청/응답용)
export interface MessageFileAttachment {
  fileId: number;
  fileUrl: string; // S3 URL
  originalFileName: string; // 원본 파일명
  contentType?: string;
  thumbnailUrl?: string; // 이미지 미리보기용 (로컬 Blob URL)
}

// 메시지 전송 시 사용하는 파일 정보
export interface MessageFileInfo {
  fileUrl: string;
  originalFileName: string;
  fileId: number;
}
