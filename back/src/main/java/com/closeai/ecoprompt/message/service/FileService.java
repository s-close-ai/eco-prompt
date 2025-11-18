package com.closeai.ecoprompt.message.service;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.message.model.entity.File;
import com.closeai.ecoprompt.message.repository.FileRepository;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
@RequiredArgsConstructor
public class FileService {

	private final S3Client s3Client;
	private final FileRepository fileRepository;

	@Value("${aws.s3.bucket}")
	private String bucketName;

	private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
	private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "pdf", "csv");

	public String uploadFile(MultipartFile file, String messageUUID) throws IOException {

		// 1. 파일명 생성
		String originalFileName = file.getOriginalFilename();
		String fileExtension = getFileExtension(originalFileName);
		String s3FileName = UUID.randomUUID().toString() + "." + fileExtension;
		String s3KeyWithFolder = "2ofsvz/" + s3FileName;

		// 2. S3에 저장할 파일 저장
		PutObjectRequest putObjectRequest = PutObjectRequest.builder()
			.bucket(bucketName)
			.key(s3KeyWithFolder)
			.contentType(file.getContentType())
			.build();

		// 3-1. S3 클라이언트를 사용해서 파일을 업로드
		s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

		// 3-2. Mysql에 파일 타입을 저장함
		File mysqlSaveFile = File.builder()
			.originalFileName(originalFileName)
			.saveFileName(s3KeyWithFolder)
			.fileType(file.getContentType())
			.messageUUID(messageUUID)
			.build();

		fileRepository.save(mysqlSaveFile);

		return s3KeyWithFolder;
	}

	public void validateFile(MultipartFile file) {
		// 빈 파일 검사
		if (file.isEmpty()) {
			throw new BusinessException("업로드할 파일이 없습니다.");
		}
		// 파일 크기 검사
		if (file.getSize() > MAX_FILE_SIZE) {
			throw new BusinessException("파일 크기가 너무 큽니다.");
		}
		// 확장자 검사
		String originalFileName = file.getOriginalFilename();
		String fileExtension = getFileExtension(originalFileName);

		if (fileExtension.isEmpty() || !ALLOWED_EXTENSIONS.contains(fileExtension.toLowerCase())) {
			throw new BusinessException("허용되지 않는 파일 확장자입니다. (허용: jpg, jpeg, png, pdf, csv)");
		}
	}

	// 파일 확장자를 추출하는 헬퍼 메서드
	private String getFileExtension(String fileName) {
		if (fileName == null || fileName.lastIndexOf(".") == -1) {
			return ""; // 확장자가 없는 경우
		}
		return fileName.substring(fileName.lastIndexOf(".") + 1);
	}
}
