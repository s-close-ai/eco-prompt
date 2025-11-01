# judge_llm/api/api/app/pipeline.py
from __future__ import annotations
from typing import Dict, Any, List, Tuple, Optional
from .ports import MongoReader, JudgeClient, SensitiveMasker, TrainRepository, MainLlmClient
from .models import normalize_judge_json
import os

def _pick(item: Dict[str, Any], *keys: str, default: str="") -> str:
    for k in keys:
        if k in item and item[k] is not None:
            return str(item[k])
    return default

def _norm_item(item: Dict[str, Any]) -> tuple[str,str,str,str]:
    message_id = _pick(item, "message_id")
    prompt = _pick(item, "prompt", "question", "q")
    llm_response = _pick(item, "llm_response", "answer", "a_user")
    rejected_response = _pick(item, "rejected_response", default="")
    return message_id, prompt, llm_response, rejected_response

class ManualTrainPipeline:
    """
    - 평가 입력은 생데이터 사용(마스킹 없음).
    - 통과 시 마스킹하여 DB 업서트 + 메인 LLM 호출.
    - 운영 기준: total >= JUDGE_PASS_MIN_TOTAL(기본 75) 사용(JUDGE_USE_TOTAL=true).
    """
    def __init__(self, mongo: MongoReader, judge: JudgeClient, masker: SensitiveMasker,
                 repo: TrainRepository, main_llm: Optional[MainLlmClient] = None):
        self.mongo = mongo
        self.judge = judge
        self.masker = masker
        self.repo = repo
        self.main_llm = main_llm

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id: str = str(payload.get("batch_id") or payload.get("batchId") or "default")
        if "items" in payload and "dataset" in payload:
            raise ValueError("Use only 'dataset' (not both).")
        if "dataset" not in payload:
            raise ValueError("Missing 'dataset'.")
        items: List[Dict[str, Any]] = list(payload.get("dataset") or [])
        if not items:
            raise ValueError("Empty 'dataset'.")

        use_total  = os.getenv("JUDGE_USE_TOTAL", "true").lower() == "true"
        thr_final  = float(os.getenv("JUDGE_FINAL_THRESHOLD", "3.5"))
        thr_total  = int(os.getenv("JUDGE_PASS_MIN_TOTAL", "75"))
        debug_subs = os.getenv("JUDGE_DEBUG_RETURN_SUBSCORES", "false").lower()=="true"
        strict_rec = os.getenv("JUDGE_STRICT_RECOVERED", "false").lower()=="true"

        results: List[Dict[str, Any]] = []
        upserts: List[Dict[str, Any]] = []
        to_train: List[Dict[str, Any]] = []
        success_eval = 0

        for row in items:
            try:
                message_id, prompt, llm_resp, rejected = _norm_item(row)
                eval_answer = llm_resp or rejected or ""

                # 1) Judge 평가 (비마스킹)
                jres = await self.judge.evaluate(prompt=prompt, answer=eval_answer)

                # 2) 정규화
                try:
                    norm = normalize_judge_json(jres.get("raw", jres))
                except Exception as e:
                    norm = normalize_judge_json({"final_score": 3.0, "feedback": f"normalize-recovered: {e}"})
                final_score = float(getattr(norm, "final_score", 0.0) or 0.0)
                total = int(getattr(norm, "total", 0) or 0)

                # 3) 통과 판정
                _trainable = (total >= thr_total) if use_total else (final_score >= thr_final)
                if strict_rec and getattr(norm, "recovered", False):
                    _trainable = False
                passed = _trainable

                # 4) 마스킹 (통과 시)
                if passed:
                    prompt_m   = self.masker.mask(prompt)
                    llm_resp_m = self.masker.mask(llm_resp)
                    rejected_m = self.masker.mask(rejected)
                else:
                    prompt_m = llm_resp_m = rejected_m = ""

                # 5) DB 업서트: "통과한 것만" 저장
                if passed:
                    upserts.append({
                        "batch_id": batch_id,
                        "message_id": message_id,
                        "prompt": prompt_m,
                        "llm_response": llm_resp_m,
                        "rejected_response": rejected_m,
                        "judge_total": total,
                        "passed": True,
                    })

                # 6) 메인 LLM 전송 후보
                if passed:
                    to_train.append({
                        "message_id": message_id,
                        "prompt": prompt_m,
                        "llm_response": llm_resp_m,
                        "rejected_response": rejected_m
                    })

                item_res = {"message_id": message_id, "total": total, "final_score": final_score, "passed": passed}
                if debug_subs:
                    subs = getattr(norm, "subscores", None)
                    if subs:
                        item_res["subscores"] = getattr(subs, "model_dump", lambda: subs)()
                results.append(item_res)
                success_eval += 1

            except Exception as e:
                results.append({"message_id": row.get("message_id"), "error": str(e), "status": "FAILED_EVAL"})

        # 7) 업서트
        up_ok = up_fail = 0
        if upserts:
            try:
                up_ok, up_fail = await self.repo.upsert_many(upserts)
            except Exception as e:
                results.append({"error": f"UPSERT_FAILED: {e}"})

        # 8) 메인 LLM 호출
        triggered = False; ack = None; err = None
        if to_train and self.main_llm:
            try:
                ack = await self.main_llm.train(batch_id=batch_id, items=to_train)
                triggered = True
            except Exception as e:
                err = f"MAIN_LLM_TRIGGER_FAILED: {e}"

        failed_eval_cnt = sum(1 for r in results if r.get("status") == "FAILED_EVAL")
        return {
            "batch_id": batch_id,
            "processed": len(items),
            "success_eval": success_eval,
            "failed_eval": failed_eval_cnt,
            "upserted": up_ok,
            "upsert_failed": up_fail,
            "main_llm_triggered": triggered,
            "main_llm_ack": ack,
            "main_llm_error": err,
            "results": results,
        }
