package com.closeai.ecoprompt.message.repository;

import java.util.List;
import java.util.Optional;

import com.closeai.ecoprompt.message.model.dto.response.DailyRankingProjection;
import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageJpaRepository extends JpaRepository<Message, Long> {

	Optional<Message> findByMessageUUIDAndSenderType(String messageUUID, MessageSender senderType);
	Optional<Message> findTopByChatting_IdOrderByCreatedAtDesc(Long chattingId);

	@Query(value = """
        SELECT
            m.user_id AS userId,
            u.name    AS name,
            COALESCE(MAX(sc.clarity_score + sc.specificity_score + sc.format_score + sc.safety_score), 0) AS maxScore,
            COALESCE(SUM(mi.value), 0) AS mileageSum,
            COALESCE(SUM(CASE WHEN m.sender_type = 'USER' THEN 1 ELSE 0 END), 0) AS promptCount
        FROM message m
        JOIN user u ON u.user_id = m.user_id
        LEFT JOIN score   sc ON sc.message_id = m.message_id
        LEFT JOIN mileage mi ON mi.message_id = m.message_id
        WHERE m.is_deleted = 'N'
          AND m.created_at BETWEEN :startOfDay AND :nowStr
        GROUP BY m.user_id, u.name
        ORDER BY maxScore DESC, mileageSum DESC, promptCount ASC
        LIMIT 10
        """, nativeQuery = true)
	List<DailyRankingProjection> findTodayTop10WithName(
			@Param("startOfDay") String startOfDay,
			@Param("nowStr")     String nowStr
	);

}