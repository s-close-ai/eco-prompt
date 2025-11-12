package com.closeai.ecoprompt.training.service;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;
import com.closeai.ecoprompt.message.repository.mongo.MessageMongoRepository;
import com.closeai.ecoprompt.training.model.dto.TrainingItem;
import com.closeai.ecoprompt.training.model.dto.request.TrainingRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TrainingTriggerJob {

    private final MongoTemplate mongoTemplate;
    private final MessageMongoRepository messageMongoRepository;
    private final WebClient webClientTrainingJudge;

    // 커스텀 포맷(문자 비교 가능) + UTC 고정
    private static final DateTimeFormatter CREATED_FMT_UTC =
            DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss").withZone(ZoneOffset.UTC);
    private static final ZoneId Z_KST = ZoneId.of("Asia/Seoul");

    /**
     * 매일 04:00 (KST) 실행.
     * 대상: "하루 동안 생산된 메시지의 점수" 중 75점 초과만 {messageUUID, sender_type, content} 배열로 전달
     */
    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
    @Transactional(readOnly = true)
    public void triggerModelTraining() {
        // KST 기준 '오늘'의 하루 범위를 대상(= 오늘 00:00~23:59:59 KST)
        LocalDate todayKst   = LocalDate.now(Z_KST);
        LocalDate targetDay  = todayKst; // 필요 시 .minusDays(1)로 조정

        // KST 경계를 UTC Instant로 변환
        ZonedDateTime kstStart = targetDay.atStartOfDay(Z_KST);
        ZonedDateTime kstEnd   = targetDay.atTime(23, 59, 59).atZone(Z_KST);

        String startStrUtc = CREATED_FMT_UTC.format(kstStart.toInstant());
        String endStrUtc   = CREATED_FMT_UTC.format(kstEnd.toInstant());

        log.info("[TrainingScheduler] KST[{} ~ {}] -> UTC[{} ~ {}]",
                kstStart, kstEnd, startStrUtc, endStrUtc);

        // 1) 조건에 맞는 messageUUID "중복 제거(distinct)" 조회
        List<String> highScoreUuids = findHighScoreMessageUUIDs(startStrUtc, endStrUtc, 70.0);

        if (highScoreUuids.isEmpty()) {
            log.info("[TrainingScheduler] {} ~ {} 고득점(UUID) 없음 -> 종료", startStrUtc, endStrUtc);
            return;
        }

        // 1-1) 필수 발신자 타입(USER, AI, TRAINING)이 모두 존재하는 UUID만 남기기
        List<MessageSender> requiredSenders = List.of(MessageSender.USER, MessageSender.AI, MessageSender.TRAINING);
        List<String> qualifiedUuids = filterUuidsHavingAllSenderTypes(highScoreUuids, requiredSenders);
        if (qualifiedUuids.isEmpty()) {
            log.info("[TrainingScheduler] 필수 발신자(USER/AI/TRAINING) 구성 충족 UUID 없음 -> 종료");
            return;
        }

        // 2) 학습에 사용할 sender_type만 필터 (예: USER + AI + TRAINING)
        List<MessageSender> sendersForTraining = requiredSenders;

        List<MessageDocument> docs = messageMongoRepository
                .findByMessageUUIDInAndSenderTypeIn(qualifiedUuids, sendersForTraining);

        if (docs.isEmpty()) {
            log.info("[TrainingScheduler] 대상 UUID({})에 해당하는 메시지 없음 -> 종료", qualifiedUuids.size());
            return;
        }

        // 3) {messageUUID, sender_type, content} 매핑
        List<TrainingItem> items = docs.stream()
                .map(d -> new TrainingItem(d.getMessageUUID(), d.getSenderType(), d.getContent()))
                .toList();

        TrainingRequest requestBody = new TrainingRequest(items);

        // 4) judge_llm에 비동기 전송
        webClientTrainingJudge.post()
                .uri("/api/v1/ai/training")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .toBodilessEntity()
                .doOnSuccess(resp -> log.info("[TrainingScheduler] judge_llm 전송 완료. items={}, status={}",
                        items.size(), resp.getStatusCode()))
                .doOnError(err -> log.error("[TrainingScheduler] judge_llm 전송 실패: {}", err.getMessage(), err))
                .subscribe(); // 비동기 시작
    }

    /**
     * score_info.totalScore >= minScore
     * && status="RECEIVED" (※ ERROR 등은 자연히 제외)
     * && created_at in [startStrUtc, endStrUtc]  // created_at은 문자열(UTC 포맷)
     */
    private List<String> findHighScoreMessageUUIDs(String startStrUtc, String endStrUtc, double minScore) {
        Criteria criteria = new Criteria().andOperator(
                Criteria.where("status").is(MessageStatus.RECEIVED.name()),
                Criteria.where("created_at").gte(startStrUtc).lte(endStrUtc),
                Criteria.where("score_info.totalScore").gte(minScore)
        );

        Query query = new Query(criteria);
        query.fields().include("messageUUID");

        // 컬렉션 이름이 "message" 라는 전제
        return mongoTemplate.findDistinct(query, "messageUUID", "message", String.class);
    }

    /**
     * 1-1 구현:
     * 입력된 UUID들 중에서 sender_type이 USER/AI/TRAINING 모두 존재하는 UUID만 반환.
     * (상태 필터가 필요하면 match 단계에 추가 가능)
     */
    private List<String> filterUuidsHavingAllSenderTypes(Collection<String> uuids,
                                                         Collection<MessageSender> requiredSenders) {
        if (uuids == null || uuids.isEmpty()) return List.of();

        Aggregation agg = Aggregation.newAggregation(
                // 필요한 UUID + 필요한 sender_type만 우선 매치
                Aggregation.match(
                        Criteria.where("messageUUID").in(uuids)
                                .and("sender_type").in(requiredSenders) // Enum이 문자열로 저장되어 있다면 그대로 매칭됨
                ),
                // UUID별로 등장한 sender_type 집합 생성
                Aggregation.group("messageUUID")
                        .addToSet("sender_type").as("senders"),
                // senders 배열이 requiredSenders 전부를 포함하는 경우만
                Aggregation.match(
                        Criteria.where("senders").all(requiredSenders)
                ),
                // 결과를 { messageUUID: <_id> } 형태로 변환
                Aggregation.project().and("_id").as("messageUUID")
        );

        // 컬렉션 이름: "message"
        var results = mongoTemplate.aggregate(agg, "message", org.bson.Document.class);

        return results.getMappedResults().stream()
                .map(doc -> doc.getString("messageUUID"))
                .toList();
    }
}
