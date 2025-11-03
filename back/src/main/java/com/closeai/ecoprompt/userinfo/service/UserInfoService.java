package com.closeai.ecoprompt.userinfo.service;

import org.springframework.stereotype.Service;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserInfoService {

	private final UserInfoRepository userInfoRepository;

	public String getPersonalPrompt(Integer userId){

		UserInfo userInfo = userInfoRepository.getPersonalPromptByUserId(userId)
			.orElseThrow(() -> new BusinessException("사용자 정보 조회에 실패했습니다"));

		return userInfo.getPersonalPrompt();
	}
}
