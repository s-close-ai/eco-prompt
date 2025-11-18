package com.closeai.ecoprompt.message.model.dto.request;

import java.util.List;

import org.hibernate.validator.constraints.Length;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record SubmitMessageRequest(
	@Schema(example = "1")
	Integer projectId,

	@Schema(example = "1")
	Long chattingId,

	@Schema(example = "1+1의 결과값을 알려주세요.")
	@Length(min = 1, max = 25000)
	String content,

	@Size(max = 3)
	List<MultipartFile> files
) {

}
