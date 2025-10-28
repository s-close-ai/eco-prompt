# 트리거 진입점(오케스트레이터)
# judge/app/pipeline.py
from __future__ import annotations
from typing import Dict, Any, List, Tuple, Optional
from .ports import MongoReader, JudgeClient, SensitiveMasker, TrainRepository, MainLlmClient
from .models import normalize_judge_json  # 정규화(타입/길이 보정, total 계산 등)

def _norm_triplet(item: Dict[str, Any]) -> Tuple[str, str, str, Optional[str]]:
    """
    payload item에서 (prompt, user-preferred answer, train-only answer, pair_id) 추출.
    키명은 백엔드 확정 전이므로 유연 매핑.
    """
    p = item.get("prompt") or item.get("question") or item.get("q") or ""
    a_user  = item.get("answerUser")  or item.get("answer_user")  or item.get("a_user")  or item.get("answer") or ""
    a_train = item.get("answerTrain") or item.get("answer_train") or item.get("a_train") or ""
    pair_id = item.get("pair_id") or item.get("_id") or item.get("id")
    return str(p), str(a_user), str(a_train), (str(pair_id) if pair_id is not None else None)

class ManualTrainPipeline:
    """
    수동 AI 모델 학습 오케스트레이터(경량판).
    - 반드시 payload.items가 있어야 함. 없으면 즉시 오류 반환(백엔드로 전달).
    - Prometheus-2 출력은 재평가 없이 정규화만 수행.
    - trainable = (final_score >= 3.5)  # 단일 기준
    """

    def __init__(self,
                 mongo: MongoReader,
                 judge: JudgeClient,
                 masker: SensitiveMasker,
                 repo: TrainRepository,
                 main_llm: Optional[MainLlmClient] = None):
        self.mongo = mongo
        self.judge = judge
        self.masker = masker
        self.repo = repo
        self.main_llm = main_llm

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id: str = str(payload.get("batchId", "default"))

        # 0) 필수: items 존재 여부 검증
        items: List[Dict[str, Any]] = list(payload.get("items") or [])
        if not items:
            # 여기서 예외를 던지면 라우터(main.py)에서 400으로 변환해 응답하도록
            raise ValueError("NO_ITEMS: payload.items is required for manual training")

        results: List[Dict[str, Any]] = []
        upsert_buffer: List[Dict[str, Any]] = []
        masked_for_train: List[Dict[str, Any]] = []
        success_eval = 0

        # 1) 평가 → 정규화 → 임계점 판정(최종 점수만) → 마스킹 → 적재 후보 구성
        for row in items:
            try:
                prompt, ans_user, ans_train, pair_id = _norm_triplet(row)
                pid = pair_id or row.get("pair_id") or row.get("_id") or "NA"

                # Judge 호출
                jres = await self.judge.evaluate(prompt=prompt, answer=ans_user)

                # 정규화(재평가 없음)
                norm = normalize_judge_json(jres.get("raw", jres))
                final_score = float(norm.final_score)  # 0~5(소수 허용)
                trainable = (final_score >= 3.5)       # 단일 기준

                # 마스킹(세 항목 모두)
                prompt_m   = self.masker.mask(prompt)
                ans_user_m = self.masker.mask(ans_user)
                ans_train_m= self.masker.mask(ans_train)

                # DB upsert 후보(원본+마스킹본 모두 저장)
                upsert_buffer.append({
                    "batch_id": batch_id,
                    "source": "payload_items",
                    "pair_id": pid,
                    "prompt": prompt,
                    "answer_user": ans_user,
                    "answer_train": ans_train,
                    "prompt_masked": prompt_m,
                    "answer_user_masked": ans_user_m,
                    "answer_train_masked": ans_train_m,
                    "final_score": final_score,      # 0~5
                    "total": norm.total,             # 0~100(레거시 지표 유지)
                    "criteria": norm.criteria,
                    "feedback": norm.feedback,
                    "subscores": (norm.subscores.dict() if norm.subscores else None),
                    "lang": norm.lang,
                    "trainable": trainable,
                })

                # 메인 LLM 학습 전달용(마스킹본)
                if trainable:
                    masked_for_train.append({
                        "pair_id": pid,
                        "prompt": prompt_m,
                        "answerUser": ans_user_m,
                        "answerTrain": ans_train_m,
                    })

                results.append({
                    "pair_id": pid,
                    "final_score": final_score,
                    "total": norm.total,
                    "trainable": trainable,
                    "status": "QUEUED_FOR_UPSERT"
                })
                success_eval += 1

            except Exception as e:
                results.append({
                    "pair_id": row.get("pair_id") or row.get("_id"),
                    "error": str(e),
                    "status": "FAILED_EVAL"
                })

        # 2) DB 적재
        up_ok, up_fail = (0, 0)
        if upsert_buffer:
            try:
                up_ok, up_fail = await self.repo.upsert_many(upsert_buffer)
            except Exception as e:
                results.append({"error": f"UPSERT_FAILED: {e}"})

        # 3) (선택) 메인 LLM 학습 트리거
        main_llm_triggered = False
        main_llm_ack = None
        if masked_for_train and self.main_llm:
            try:
                main_llm_ack = await self.main_llm.trigger_training(batch_id=batch_id, items=masked_for_train)
                main_llm_triggered = True
            except Exception as e:
                results.append({"error": f"MAIN_LLM_TRIGGER_FAILED: {e}"})

        # 4) 요약 응답
        failed_eval_cnt = sum(1 for r in results if r.get("status") == "FAILED_EVAL")
        return {
            "batch_id": batch_id,
            "processed": len(results),
            "success_eval": success_eval,
            "failed_eval": failed_eval_cnt,
            "upserted": up_ok,
            "upsert_failed": up_fail,
            "main_llm_triggered": main_llm_triggered,
            "main_llm_ack": main_llm_ack,
            "results": results,
        }
