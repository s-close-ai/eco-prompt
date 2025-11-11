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
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TrainingTriggerJob {

    private final MongoTemplate mongoTemplate;
    private final MessageMongoRepository messageMongoRepository;
    private final WebClient webClientTrainingJudge; // Bean으로 주입 (아래 4) 참고)

    private static final DateTimeFormatter CREATED_FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss");

    /**
     * 매일 04:00 (KST) 실행.
     * 대상: "하루 동안 생산된 메시지의 점수를 조회하여 75점이 넘는 경우만 {messageUUID, sender_type, content} 배열로 전달"
     */
    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
    @Transactional(readOnly = true)
    public void triggerModelTraining() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        LocalDate targetDay = today.minusDays(0);

        // 00:00:00 ~ 23:59:59 (문자 비교가 가능한 포맷 사용 중)
        String startStr = targetDay.atStartOfDay().format(CREATED_FMT);
        String endStr = targetDay.atTime(23, 59, 59).format(CREATED_FMT);

        // 1) 조건에 맞는 messageUUID "중복 제거(distinct)" 조회
        List<String> highScoreUuids = findHighScoreMessageUUIDs(startStr, endStr, 75.0);

        if (highScoreUuids.isEmpty()) {
            log.info("[TrainingScheduler] {} ~ {} 고득점(UUID) 없음 -> 종료", startStr, endStr);
            return;
        }

        // 2) 해당 UUID들의 메시지 중, 학습에 사용할 sender_type만 추출 (필요 시 조정)
        //    예) USER + TRAINING 만 사용 (AI는 제외)
        List<MessageSender> sendersForTraining = List.of(MessageSender.USER, MessageSender.TRAINING);

        List<MessageDocument> docs = messageMongoRepository
                .findByMessageUUIDInAndSenderTypeIn(highScoreUuids, sendersForTraining);

        if (docs.isEmpty()) {
            log.info("[TrainingScheduler] 대상 UUID({})에 해당하는 메시지 없음 -> 종료", highScoreUuids.size());
            return;
        }

        // 3) {messageUUID, sender_type, content} 로 매핑
        List<TrainingItem> items = docs.stream()
                .map(d -> new TrainingItem(
                        d.getMessageUUID(),
                        d.getSenderType(),
                        d.getContent())
                )
                .toList();

        TrainingRequest requestBody = new TrainingRequest(items);

        // 4) judge_llm에 전송
        webClientTrainingJudge.post()
                .uri("/api/v1/ai/training")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .toBodilessEntity()
                .doOnSuccess(resp -> log.info("[TrainingScheduler] judge_llm 전송 완료. items={}, status={}",
                        items.size(), resp.getStatusCode()))
                .doOnError(err -> log.error("[TrainingScheduler] judge_llm 전송 실패: {}", err.getMessage(), err))
                .subscribe(); // 비동기 요청 시작 (스레드 반환됨)
    }

    /**
     * score_info.totalScore >= minScore && status="RECEIVED"
     * && created_at in [startStr, endStr] 조건으로 messageUUID를 distinct 조회
     * <p>
     * created_at이 String으로 저장되었으므로 Criteria를 문자열 비교로 처리.
     */
    private List<String> findHighScoreMessageUUIDs(String startStr, String endStr, double minScore) {
        Criteria criteria = new Criteria()
                .andOperator(
                        Criteria.where("status").is(MessageStatus.RECEIVED.name()),
                        Criteria.where("created_at").gte(startStr).lte(endStr),
                        Criteria.where("score_info.totalScore").gte(minScore)
                );

        Query query = new Query(criteria);
        // projection: messageUUID만 필요
        query.fields().include("messageUUID");

        // distinct로 messageUUID만 추출
        return mongoTemplate.findDistinct(query, "messageUUID", "message", String.class);
    }
}