# 트리거 진입점(오케스트레이터)
# judge/app/pipeline.py
from typing import Dict, Any, List, Tuple, Optional
from .ports import MongoReader, JudgeClient, SensitiveMasker, TrainRepository, MainLlmClient

def _norm_triplet(item: Dict[str, Any]) -> Tuple[str, str, str, Any]:
    """
    한 항목에서 (1)prompt, (2)사용자 선호 답변, (3)훈련 전용 답변을 추출.
    - 백엔드 확정 전이므로 대표 키 후보를 유연하게 수용.
    """
    p = item.get("prompt") or item.get("question") or item.get("q") or ""
    a_user  = item.get("answerUser") or item.get("answer_user") or item.get("a_user") or item.get("answer") or ""
    a_train = item.get("answerTrain") or item.get("answer_train") or item.get("a_train") or ""
    pair_id = item.get("pair_id") or item.get("_id") or item.get("id")
    return str(p), str(a_user), str(a_train), pair_id


class ManualTrainPipeline:
    """
    '수동 AI 모델 학습' 트리거 진입점.
    - API 바디 스키마는 백엔드가 확정.
    - 여기서는 dict payload만 받아 내부 플로우를 오케스트레이션.
    """

    def __init__(
        self,
        mongo: MongoReader,
        judge: JudgeClient,
        masker: SensitiveMasker,
        repo: TrainRepository,
        main_llm: Optional[MainLlmClient] = None,
    ):
        self.mongo = mongo
        self.judge = judge
        self.masker = masker
        self.repo = repo
        self.main_llm = main_llm  # 메인 LLM 학습 호출(선택)

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        payload 예:
          - {'minScore': 70, 'batchId': 'one'}  # Mongo에서 조회해 처리
          - {'minScore': 70, 'batchId': 'one', 'items': [...]}  # 전달된 목록 바로 처리
        """
        min_score = int(payload.get("minScore", 70))     # 임시 기본값
        batch_id  = payload.get("batchId", "default")    # 임시 기본값

        # 1) 입력 소스 선택: payload.items 있으면 그걸 사용, 없으면 Mongo 조회
        incoming = list(payload.get("items") or [])
        if incoming:
            pairs = incoming
        else:
            pairs = await self.mongo.fetch_pairs(min_score=min_score)

        results: List[Dict[str, Any]] = []
        rows_to_upsert: List[Dict[str, Any]] = []
        masked_for_train: List[Dict[str, Any]] = []
        success = 0

        # 2) (1,2)로 Judge 평가 → 임계 이상이면 1·2·3 모두 마스킹 → 적재/훈련 후보 구성
        for it in pairs:
            try:
                prompt, ans_user, ans_train, pair_id = _norm_triplet(it)

                # Judge: (prompt, 사용자 선호 답변) 쌍 평가
                eval_res = await self.judge.evaluate(prompt=prompt, answer=ans_user)
                score = int(eval_res.get("score", -1))  # 실제 키 확정 전

                if score >= min_score:
                    # 1·2·3 모두 마스킹
                    masked_prompt = self.masker.mask(prompt)     # 1-1
                    masked_user   = self.masker.mask(ans_user)   # 2-1
                    masked_train  = self.masker.mask(ans_train)  # 3-1

                    # DB 적재(UPSERT) 후보
                    rows_to_upsert.append({
                        "batch_id": batch_id,
                        "pair_id": pair_id,
                        "prompt": prompt,
                        "answer_user": ans_user,
                        "answer_train": ans_train,
                        "prompt_masked": masked_prompt,
                        "answer_user_masked": masked_user,
                        "answer_train_masked": masked_train,
                        "score": score,
                        "feedback": eval_res.get("feedback"),
                        "trainable": True,  # 최종 기준은 스토리4에서 확정
                    })

                    # 메인 LLM 학습 전달용(마스킹본, 원본 키 네이밍 유지)
                    masked_for_train.append({
                        "pair_id": pair_id,
                        "prompt": masked_prompt,      # 1-1
                        "answerUser": masked_user,    # 2-1
                        "answerTrain": masked_train,  # 3-1
                    })

                    results.append({"pair_id": pair_id, "score": score, "status": "QUEUED"})
                    success += 1
                else:
                    results.append({"pair_id": pair_id, "score": score, "status": "SKIPPED_LOW_SCORE"})
            except Exception as e:
                results.append({"pair_id": it.get("pair_id"), "error": str(e), "status": "FAILED_EVAL"})

        # 3) DB 업서트
        up_ok, up_fail = (0, 0)
        if rows_to_upsert:
            try:
                up_ok, up_fail = await self.repo.upsert_many(rows_to_upsert)
            except Exception as e:
                results.append({"error": f"UPSERT_FAILED: {e}"})

        # 4) 메인 LLM 학습 API 호출(있을 경우만)
        main_llm_resp = None
        if masked_for_train and self.main_llm:
            try:
                main_llm_resp = await self.main_llm.train(masked_for_train)
            except Exception as e:
                results.append({"error": f"MAIN_LLM_TRAIN_FAILED: {e}"})

        # 5) 요약 응답
        return {
            "processed": len(results),
            "success": success,
            "failed": len([r for r in results if str(r.get("status", "")).startswith("FAILED")]),
            "upserted": up_ok,
            "upsert_failed": up_fail,
            "train_sent": len(masked_for_train),
            "main_llm_response": main_llm_resp,
            "results": results,
        }
