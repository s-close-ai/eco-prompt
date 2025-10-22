package com.closeai.ecoprompt.common;

import org.apache.coyote.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApiResponse<T> {
	private String status;
	private T data;

	public static <T> ResponseEntity<ApiResponse<T>> success(T data) {
		return ResponseEntity.ok().body(new ApiResponse<>("SUCCESS", data));
	}

	public static <T> ResponseEntity<ApiResponse<T>> created(T data) {
		return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponse<>("SUCCESS",data));
	}

	public static <T> ResponseEntity<ApiResponse<T>> accepted(T data) {
		return ResponseEntity.status(HttpStatus.ACCEPTED).body(new ApiResponse<>("SUCCESS", data));
	}

	public static <T> ResponseEntity<ApiResponse<T>> noContent(T data) {
		return ResponseEntity.status(HttpStatus.NO_CONTENT).body(new ApiResponse<>("SUCCESS", data));
	}

	public static <T> ResponseEntity<ApiResponse<T>> BusinessException(HttpStatus httpStatus, T data) {
		return ResponseEntity.status(httpStatus).body(new ApiResponse<>("FAIL",data));
	}

}
