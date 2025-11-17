package com.closeai.ecoprompt.user.repository;

import a306.dependency_logger_starter.logging.annotation.NoLogging;
import com.closeai.ecoprompt.user.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@NoLogging
public interface UserRepository extends JpaRepository<User,Integer> {

    Optional<User> findByEmail(String email);
}
