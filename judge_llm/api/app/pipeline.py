# 트리거 진입점(오케스트레이터)
# judge_llm/api/app/pipeline.py
from __future__ import annotations
from typing import Dict, Any, List, Tuple, Optional
from .ports import MongoReader, JudgeClient, SensitiveMasker, TrainRepository, MainLlmClient
from .models import normalize_judge_json
import os

def _norm_triplet(item: Dict[str, Any]) -> Tuple[str, str, str, Optional[str]]:
    p = item.get("prompt") or item.get("question") or item.get("q") or ""
    a_user  = item.get("answerUser")  or item.get("answer_user")  or item.get("a_user")  or item.get("answer") or ""
    a_train = item.get("answerTrain") or item.get("answer_train") or item.get("a_train") or ""
    pair_id = item.get("pair_id") or item.get("_id") or item.get("id")
    return str(p), str(a_user), str(a_train), (str(pair_id) if pair_id is not None else None)

def _apply_mask_into_original_row(row: Dict[str, Any], prompt_m: str, ans_user_m: str, ans_train_m: str) -> Dict[str, Any]:
    masked = dict(row)
    for k in ("prompt", "question", "q"):
        if k in masked: masked[k] = prompt_m
    for k in ("answerUser", "answer_user", "a_user", "answer"):
        if k in masked: masked[k] = ans_user_m
    for k in ("answerTrain", "answer_train", "a_train"):
        if k in masked: masked[k] = ans_train_m
    return masked

class ManualTrainPipeline:
    """
    - 평가 입력에는 마스킹 적용하지 않음(요구사항).
    - 저장 및 콜백 시에는 값만 마스킹.
    - trainable 기준: final_score >= 3.5 (기본), 또는 total 기준 선택.
    """
    def __init__(self, mongo: MongoReader, judge: JudgeClient, masker: SensitiveMasker,
                 repo: TrainRepository, main_llm: Optional[MainLlmClient] = None):
        self.mongo = mongo
        self.judge = judge
        self.masker = masker
        self.repo = repo
        self.main_llm = main_llm

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id: str = str(payload.get("batchId", "default"))
        items: List[Dict[str, Any]] = list(payload.get("items") or [])
        if not items:
            raise ValueError("NO_ITEMS: payload.items is required for manual training")

        use_total  = os.getenv("JUDGE_USE_TOTAL", "false").lower() == "true"
        debug_return_subscores = os.getenv("JUDGE_DEBUG_RETURN_SUBSCORES", "false").lower() == "true"
        thr_final  = float(os.getenv("JUDGE_FINAL_THRESHOLD", "3.5"))
        thr_total  = int(os.getenv("JUDGE_PASS_MIN_TOTAL", "75"))
        strict_rec = os.getenv("JUDGE_STRICT_RECOVERED", "false").lower() == "true"

        results: List[Dict[str, Any]] = []
        upsert_buffer: List[Dict[str, Any]] = []
        masked_for_train: List[Dict[str, Any]] = []
        success_eval = 0

        for row in items:
            try:
                prompt, ans_user, ans_train, pair_id = _norm_triplet(row)
                eval_answer = ans_user if (ans_user is not None and ans_user.strip() != "") else (ans_train or "")
                pid = pair_id or row.get("pair_id") or row.get("_id") or row.get("id") or "NA"

                # 평가(마스킹 미적용)
                jres = await self.judge.evaluate(prompt=prompt, answer=eval_answer)

                # 정규화
                try:
                    norm = normalize_judge_json(jres.get("raw", jres))
                except Exception as e:
                    norm = normalize_judge_json({"final_score": 3.0, "feedback": f"normalize-recovered: {e}"})

                try:
                    final_score = float(norm.final_score)
                except Exception:
                    final_score = 0.0

                # 임계 판정
                _trainable = (int(norm.total) >= thr_total) if use_total else (final_score >= thr_final)
                trainable = (False if (strict_rec and norm.recovered) else _trainable)

                # 값 마스킹
                prompt_m   = self.masker.mask(prompt)
                ans_user_m = self.masker.mask(ans_user)
                ans_train_m= self.masker.mask(ans_train)

                # DB 적재용
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
                    "subscores": (norm.subscores.model_dump()
                                  if hasattr(norm.subscores, "model_dump") and norm.subscores
                                  else (norm.subscores.dict() if norm.subscores else None)),
                    "lang": norm.lang,
                    "trainable": trainable,
                })

                # 콜백 후보
                if trainable:
                    masked_row = _apply_mask_into_original_row(row=row, prompt_m=prompt_m,
                                                               ans_user_m=ans_user_m, ans_train_m=ans_train_m)
                    masked_for_train.append(masked_row)

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
                results.append({"pair_id": row.get("pair_id") or row.get("_id") or row.get("id"),
                                "error": str(e), "status": "FAILED_EVAL"})

        # DB 적재
        up_ok, up_fail = (0, 0)
        if upsert_buffer:
            try:
                up_ok, up_fail = await self.repo.upsert_many(upsert_buffer)
            except Exception as e:
                results.append({"error": f"UPSERT_FAILED: {e}"})

        # 메인 LLM 학습 트리거
        main_llm_triggered = False
        main_llm_ack = None
        main_llm_error = None
        if masked_for_train and self.main_llm:
            try:
                main_llm_ack = await self.main_llm.train(batch_id=batch_id, items=masked_for_train)
                main_llm_triggered = True
            except Exception as e:
                main_llm_error = f"MAIN_LLM_TRIGGER_FAILED: {e}"

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
