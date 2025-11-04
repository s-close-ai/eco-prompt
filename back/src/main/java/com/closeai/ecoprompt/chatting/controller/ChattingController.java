package com.closeai.ecoprompt.chatting.controller;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chattings")
public class ChattingController {

    private final ChattingService chattingService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ChattingResponse>>> getChattingsWithPaging(
            @RequestParam Integer projectId,
            @RequestParam(required = false, defaultValue = "0") Integer page
    ) {
        return ApiResponse.success(chattingService.getChattings(projectId, page));
    }
}
