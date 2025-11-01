package com.closeai.ecoprompt.userinfo.repository;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserInfoRepository extends JpaRepository<UserInfo,Integer> {
}
