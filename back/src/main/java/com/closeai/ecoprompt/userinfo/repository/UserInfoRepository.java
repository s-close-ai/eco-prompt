package com.closeai.ecoprompt.userinfo.repository;

import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserInfoRepository extends JpaRepository<UserInfo, Integer> {

	Optional<UserInfo> getPersonalPromptByUserId(Integer userId);
    Optional<UserInfo> findByUser_Id(Integer userId);
    Integer user(User user);

}
