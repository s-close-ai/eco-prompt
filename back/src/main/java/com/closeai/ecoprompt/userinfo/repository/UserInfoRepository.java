package com.closeai.ecoprompt.userinfo.repository;

import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserInfoRepository extends JpaRepository<UserInfo,Integer> {

    Optional<UserInfo> findByUserId(Integer id);
    Integer user(User user);
}
