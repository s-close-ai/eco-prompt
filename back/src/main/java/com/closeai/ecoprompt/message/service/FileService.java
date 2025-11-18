package com.closeai.ecoprompt.message.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.message.model.dto.request.UploadFileRequest;
import com.closeai.ecoprompt.message.model.dto.response.UploadFileResponse;
import com.closeai.ecoprompt.message.model.entity.File;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.repository.FileRepository;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@RequiredArgsConstructor
public class FileService {

	private final S3Presigner s3Presigner;
	private final FileRepository fileRepository;

	@Value("${aws.s3.bucket}")
	private String bucketName;

	private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
	private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "pdf", "csv", "txt");

	private static final String S3_USER_INPUT_DIR_PREFIX = "2ofsvz/user_input/";

	/**
	 * FE가 파일을 저장할 presignedURL 생성하는 함수 및 초기 FILE 저장
	 * */
	public UploadFileResponse makePresignedURL(UploadFileRequest request) {

		String originalFileName = request.originalFileName();
		String fileType = request.contentType();
		String fileExtension = getFileExtension(originalFileName);

		// 1. FILE 저장 이름 설정
		String savedFileName = UUID.randomUUID().toString() + "." + fileExtension;
		String s3Key = S3_USER_INPUT_DIR_PREFIX + savedFileName;

		// 2. Presigned URL 생성 요청
		PutObjectRequest putObjectRequest = PutObjectRequest.builder()
			.bucket(bucketName)
			.key(s3Key)
			.contentType(fileType)
			.build();

		PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
			.signatureDuration(Duration.ofMinutes(2))
			.putObjectRequest(putObjectRequest)
			.build();

		// 3. URL 발급
		PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
		String uploadUrl = presignedRequest.url().toString();

		// 4. DB에 FILE 저장
		File mysqlSaveFile = saveFileDB(originalFileName, savedFileName, fileType, MessageSender.USER);

		return new UploadFileResponse(uploadUrl, savedFileName, mysqlSaveFile.getId());
	}

	/**
	 * DB에 파일 저장하는 함수
	 * */
	@Transactional
	public File saveFileDB(String originalFileName, String saveFileName, String fileType, MessageSender sender) {

		File mysqlSaveFile = File.builder()
			.originalFileName(originalFileName)
			.fileType(fileType)
			.saveFileName(saveFileName)
			.senderType(sender)
			.build();

		return fileRepository.save(mysqlSaveFile);
	}

	/**
	 * 파일의 messageUUID 값을 업데이트하고 KEY값을 가져오는 함수 구현
	 * */
	@Transactional
	public List<String> getFileKeyAndUpdateMessageUUID(List<Long> fileIdList, String messageUUID) {

		if (fileIdList == null || fileIdList.isEmpty()) {
			return Collections.emptyList();
		}

		// 1. ID로 파일 리스트 조회
		List<File> files = fileRepository.findAllById(fileIdList);
		if (files.size() != fileIdList.size()) {
			throw new BusinessException("파일 저장에 누락이 있었습니다!");
		}

		List<String> s3Keys = new ArrayList<>();
		// 2. 파일 순회 시 messageUUID 변경 및 KEY값 저장
		for (File file : files) {
			file.updateMessageUUID(messageUUID);
			String key = S3_USER_INPUT_DIR_PREFIX + file.getSaveFileName();
			s3Keys.add(key);
		}

		return s3Keys;
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
			throw new BusinessException("허용되지 않는 파일 확장자입니다. (허용: jpg, jpeg, png, pdf, csv, txt)");
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
