package com.closeai.ecoprompt.message.repository;

import java.util.List;
import java.util.Optional;

import com.closeai.ecoprompt.dashboard.model.dto.response.DetailScoreResponse;
import com.closeai.ecoprompt.message.model.dto.response.DailyRankingProjection;
import com.closeai.ecoprompt.message.model.dto.response.EcoPickFlatProjection;
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

	// 전체 사용자 평균 (전체 기간)
	@Query(value = """
		SELECT
			COALESCE(AVG(sc.clarity_score), 0)      AS clarityScore,
			COALESCE(AVG(sc.specificity_score), 0)  AS specificityScore,
			COALESCE(AVG(sc.format_score), 0)       AS formatScore,
			COALESCE(AVG(sc.safety_score), 0)       AS safetyScore
		FROM message m
		JOIN score sc ON sc.message_id = m.message_id
		WHERE m.is_deleted = 'N'
    """, nativeQuery = true)
	DetailScoreResponse findAverageScoresAllUsersAllTime();

	// 특정 사용자 평균 (전체 기간)
	@Query(value = """
		SELECT
			COALESCE(AVG(sc.clarity_score), 0)      AS clarityScore,
			COALESCE(AVG(sc.specificity_score), 0)  AS specificityScore,
			COALESCE(AVG(sc.format_score), 0)       AS formatScore,
			COALESCE(AVG(sc.safety_score), 0)       AS safetyScore
		FROM message m
		JOIN score sc ON sc.message_id = m.message_id
		WHERE m.is_deleted = 'N'
		  AND m.user_id = :userId
    """, nativeQuery = true)
	DetailScoreResponse findAverageScoresByUserAllTime(@Param("userId") int userId);

	@Query(value = """
		SELECT
			u.name AS name,
			sc.total_score AS sumOfScore,
			m.message_uuid AS messageUUID,
			sc.clarity_score     AS clarityScore,
			sc.specificity_score AS specificityScore,
			sc.format_score      AS formatScore,
			sc.safety_score      AS safetyScore
		FROM message m
		JOIN score      sc  ON sc.message_id = m.message_id
		JOIN `user`     u   ON u.user_id = m.user_id
		JOIN user_info  ui  ON ui.user_id = u.user_id
		WHERE STR_TO_DATE(m.created_at, '%Y.%m.%d.%H.%i.%s')
			  BETWEEN STR_TO_DATE(:startUtc, '%Y.%m.%d.%H.%i.%s')
				  AND STR_TO_DATE(:endUtc, '%Y.%m.%d.%H.%i.%s')
		ORDER BY sc.total_score DESC
		LIMIT 3
	""", nativeQuery = true)
	List<EcoPickFlatProjection> findDailyEcoPicksTop3(
			@Param("startUtc") String startUtc,
			@Param("endUtc") String endUtc
	);

}