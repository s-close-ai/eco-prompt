package com.closeai.ecoprompt.common.exception;

import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.closeai.ecoprompt.common.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;

@ControllerAdvice
public class GlobalExceptionHandler {

	/**
	 * Bean Validation 검증 실패 시
	 */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleValidationException(MethodArgumentNotValidException ex) {
		String message = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.map(FieldError::getDefaultMessage)
			.collect(Collectors.joining(", "));

		return ApiResponse.BusinessException(HttpStatus.BAD_REQUEST, new ErrorData(message));
	}

	/**
	 * Path Variable 타입 불일치 시
	 */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleTypeMismatchException(MethodArgumentTypeMismatchException ex) {
		String message = String.format("'%s' 값은 유효하지 않은 형식입니다.", ex.getValue());
		return ApiResponse.BusinessException(HttpStatus.BAD_REQUEST, new ErrorData(message));
	}

	/**
	 * 비즈니스 로직 예외
	 */
	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleBusinessException(BusinessException ex) {
		return ApiResponse.BusinessException(HttpStatus.BAD_REQUEST, new ErrorData(ex.getMessage()));
	}

	/**
	 * IllegalArgumentException (잘못된 인수)
	 */
	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleIllegalArgumentException(IllegalArgumentException ex) {
		return ApiResponse.BusinessException(HttpStatus.BAD_REQUEST, new ErrorData(ex.getMessage()));
	}

	/**
	 * NullPointerException
	 */
	@ExceptionHandler(NullPointerException.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleNullPointerException(NullPointerException ex) {
		return ApiResponse.BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, new ErrorData("필수 데이터가 누락되었습니다."));
	}

	/**
	 * 일반적인 서버 오류
	 */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse<ErrorData>> handleGeneralException(Exception ex) {
		return ApiResponse.BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, new ErrorData("서버 오류가 발생했습니다."));
	}

	/**
	 * SSE를 위한 이벤트 handler
	 * */
	@ExceptionHandler(HttpMessageNotWritableException.class)
	public ResponseEntity<String> handleSseException(HttpMessageNotWritableException ex, HttpServletRequest request) {

		if (isSseRequest(request)) {
			return ResponseEntity
				.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.contentType(MediaType.TEXT_PLAIN)
				.body("Stream error: Failed to serialize response.");

		}
		return ResponseEntity
			.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.contentType(MediaType.TEXT_PLAIN)
			.body("Server serialization error: " + ex.getMessage());
	}

	/**
	 * SSE 요청이 맞는지 판별하는 함수
	 * */
	private boolean isSseRequest(HttpServletRequest request) {
		String accept = request.getHeader("Accept");
		return accept != null && accept.contains(MediaType.TEXT_EVENT_STREAM_VALUE);
	}

}
