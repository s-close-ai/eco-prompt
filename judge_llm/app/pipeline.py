# 트리거 진입점(오케스트레이터)
# judge/app/pipeline.py
from __future__ import annotations
from typing import Dict, Any, List, Tuple, Optional
from .ports import MongoReader, JudgeClient, SensitiveMasker, TrainRepository, MainLlmClient
from .models import normalize_judge_json  # 정규화(타입/길이 보정, total 계산 등)
import os

def _norm_triplet(item: Dict[str, Any]) -> Tuple[str, str, str, Optional[str]]:
    """
    payload item에서 (prompt, user-preferred answer, train-only answer, pair_id) 추출.
    키명은 백엔드 확정 전이므로 유연 매핑.
    * 단, 콜백에는 원본 키 그대로 사용한다 (여기서는 읽기만).
    """
    p = item.get("prompt") or item.get("question") or item.get("q") or ""
    a_user  = item.get("answerUser")  or item.get("answer_user")  or item.get("a_user")  or item.get("answer") or ""
    a_train = item.get("answerTrain") or item.get("answer_train") or item.get("a_train") or ""
    pair_id = item.get("pair_id") or item.get("_id") or item.get("id")
    return str(p), str(a_user), str(a_train), (str(pair_id) if pair_id is not None else None)

def _apply_mask_into_original_row(
    row: Dict[str, Any],
    prompt_m: str,
    ans_user_m: str,
    ans_train_m: str,
) -> Dict[str, Any]:
    """
    원본 row의 키/형태는 그대로 두고, 해당 필드들의 '값'만 마스킹 값으로 덮어쓴 사본을 만든다.
    - prompt / question / q 중 '원래 row에 존재하던' 키만 교체
    - answerUser / answer_user / a_user / answer 중 존재하던 키만 교체
    - answerTrain / answer_train / a_train 중 존재하던 키만 교체
    """
    masked = dict(row)

    for k in ("prompt", "question", "q"):
        if k in masked:
            masked[k] = prompt_m

    for k in ("answerUser", "answer_user", "a_user", "answer"):
        if k in masked:
            masked[k] = ans_user_m

    for k in ("answerTrain", "answer_train", "a_train"):
        if k in masked:
            masked[k] = ans_train_m

    return masked


class ManualTrainPipeline:
    """
    수동 AI 모델 학습 오케스트레이터 (Prometheus2 기반)
    - 반드시 payload.items가 있어야 함. 없으면 즉시 오류 반환.
    - Prometheus2 출력은 '정규화'만 수행하고 재평가 없음.
    - trainable 기준: final_score >= 3.5 (또는 total 기준 사용)
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
            raise ValueError("NO_ITEMS: payload.items is required for manual training")

        # --- 환경변수 캐싱(루프 밖) ---
        use_total  = os.getenv("JUDGE_USE_TOTAL", "false").lower() == "true"
        
        mask_prompt_eval = os.getenv("JUDGE_MASK_PROMPT_FOR_EVAL", "false").lower() == "true"
        mask_answer_eval = os.getenv("JUDGE_MASK_ANSWER_FOR_EVAL", "false").lower() == "true"
        debug_return_subscores = os.getenv("JUDGE_DEBUG_RETURN_SUBSCORES", "false").lower() == "true"


        thr_final  = float(os.getenv("JUDGE_FINAL_THRESHOLD", "3.5"))
        thr_total  = int(os.getenv("JUDGE_PASS_MIN_TOTAL", "75"))
        strict_rec = os.getenv("JUDGE_STRICT_RECOVERED", "false").lower() == "true"

        results: List[Dict[str, Any]] = []
        upsert_buffer: List[Dict[str, Any]] = []
        masked_for_train: List[Dict[str, Any]] = []
        success_eval = 0

        # 1) 평가 → 정규화 → 임계점 판정 → 마스킹 → 적재 후보 구성
        for row in items:
            try:
                prompt, ans_user, ans_train, pair_id = _norm_triplet(row)

                eval_answer = ans_user if (ans_user is not None and ans_user.strip() != "") else (ans_train or "")
                
                pid = pair_id or row.get("pair_id") or row.get("_id") or row.get("id") or "NA"

                # Judge 호출
                # jres = await self.judge.evaluate(prompt=prompt, answer=ans_user)

                # 토글: 평가 입력을 마스킹할지 여부
                prompt_for_eval = self.masker.mask(prompt) if mask_prompt_eval else prompt
                answer_for_eval = self.masker.mask(eval_answer) if mask_answer_eval else eval_answer

                jres = await self.judge.evaluate(prompt=prompt_for_eval, answer=answer_for_eval)

                # 정규화
                try:
                    norm = normalize_judge_json(jres.get("raw", jres))
                except Exception as e:
                    norm = normalize_judge_json({"final_score": 3.0, "feedback": f"normalize-recovered: {e}"})

                try:
                    final_score = float(norm.final_score)
                except Exception:
                    final_score = 0.0

                # 임계점 판정
                _trainable = (int(norm.total) >= thr_total) if use_total else (final_score >= thr_final)
                trainable = (False if (strict_rec and norm.recovered) else _trainable)

                # 마스킹(값만)
                prompt_m   = self.masker.mask(prompt)
                ans_user_m = self.masker.mask(ans_user)
                ans_train_m= self.masker.mask(ans_train)

                # DB 적재용(스키마 유지를 위한 컬럼 포함)
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
                    "final_score": final_score,
                    "total": norm.total,
                    "criteria": norm.criteria,
                    "feedback": norm.feedback,
                    "subscores": (norm.subscores.model_dump() if hasattr(norm.subscores, "model_dump") and norm.subscores else (norm.subscores.dict() if norm.subscores else None)),
                    "lang": norm.lang,
                    "trainable": trainable,
                })

                # 콜백 후보(원본 키 그대로, 값만 마스킹 치환)
                if trainable:
                    masked_row = _apply_mask_into_original_row(
                        row=row,
                        prompt_m=prompt_m,
                        ans_user_m=ans_user_m,
                        ans_train_m=ans_train_m,
                    )
                    masked_for_train.append(masked_row)

                # results.append({
                #     "pair_id": pid,
                #     "final_score": final_score,
                #     "total": norm.total,
                #     "trainable": trainable,
                #     "status": "QUEUED_FOR_UPSERT"
                # })

                item_result = {
                    "pair_id": pid,
                    "final_score": final_score,
                    "total": norm.total,
                    "trainable": trainable,
                    "status": "QUEUED_FOR_UPSERT"
                }
                if debug_return_subscores:
                    item_result["subscores"] = (norm.subscores.model_dump()
                                                if hasattr(norm.subscores, "model_dump") and norm.subscores
                                                else (norm.subscores.dict() if norm.subscores else None))
                results.append(item_result)


                success_eval += 1

            except Exception as e:
                results.append({
                    "pair_id": row.get("pair_id") or row.get("_id") or row.get("id"),
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

        # 3) 메인 LLM 학습 트리거(콜백)
        main_llm_triggered = False
        main_llm_ack = None
        main_llm_error = None
        if masked_for_train and self.main_llm:
            try:
                main_llm_ack = await self.main_llm.train(
                    batch_id=batch_id, items=masked_for_train
                )
                main_llm_triggered = True
            except Exception as e:
                main_llm_error = f"MAIN_LLM_TRIGGER_FAILED: {e}"

        # 4) 요약 응답
        failed_eval_cnt = sum(1 for r in results if r.get("status") == "FAILED_EVAL")
        return {
            "batch_id": batch_id,
            "processed": len(items),
            "success_eval": success_eval,
            "failed_eval": failed_eval_cnt,
            "upserted": up_ok,
            "upsert_failed": up_fail,
            "main_llm_triggered": main_llm_triggered,
            "main_llm_ack": main_llm_ack,
            "main_llm_error": main_llm_error,
            "results": results,
        }