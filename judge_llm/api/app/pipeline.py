# api/app/pipeline.py
from __future__ import annotations
from typing import Dict, Any, List, Optional, Iterable
from .ports import MongoReader, JudgeClient, SensitiveMasker, MainLlmClient, EcoPromptRepository
from .models import normalize_judge_json
import os
from collections import defaultdict
from datetime import datetime

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

def normalize_closeai_messages(messages: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    groups: Dict[str, Dict[str, str]] = defaultdict(lambda: {"prompt":"", "llm_response":"", "rejected_response":""})
    for raw in messages:
        mid = str(raw.get("messageUUID") or "")
        if not mid:
            continue
        stype = (raw.get("sender_type") or "").upper()
        content = str(raw.get("content") or "")
        if stype == "USER":
            groups[mid]["prompt"] = content
        elif stype == "AI":
            groups[mid]["llm_response"] = content
        elif stype == "TRAIN":
            groups[mid]["rejected_response"] = content
    items: List[Dict[str, Any]] = []
    for mid, vals in groups.items():
        items.append({
            "message_id": mid,
            "prompt": vals["prompt"],
            "llm_response": vals["llm_response"],
            "rejected_response": vals["rejected_response"],
        })
    return items

def build_masked_original_docs(messages: Iterable[Dict[str, Any]], masker: SensitiveMasker) -> List[Dict[str, Any]]:
    docs: List[Dict[str, Any]] = []
    now = datetime.utcnow()
    for raw in messages:
        doc = dict(raw)
        if "content" in doc and doc["content"] is not None:
            try:
                doc["content"] = masker.mask(str(doc["content"]))
            except Exception:
                pass
        doc.setdefault("_source", "closeai")
        doc.setdefault("_ts", now)
        docs.append(doc)
    return docs

def build_masked_docs_for_standard(batch_id: str,
                                   message_id: str,
                                   prompt_m: str,
                                   llm_resp_m: str,
                                   rejected_m: str) -> List[Dict[str, Any]]:
    """
    표준 items 통과건을 masking_message 스키마(USER/AI/TRAIN)로 변환
    - messageUUID: "{batch_id}:{message_id}"
    - sender_type: USER | AI | TRAIN (유니크 인덱스와 호환)
    """
    mmid = f"{batch_id}:{message_id}"
    base = {"messageUUID": mmid, "_source": "judge", "batch_id": batch_id, "ref_message_id": message_id, "status": "MASKED"}
    docs: List[Dict[str, Any]] = []
    if prompt_m:
        docs.append({**base, "sender_type": "USER", "content": prompt_m})
    if llm_resp_m:
        docs.append({**base, "sender_type": "AI", "content": llm_resp_m})
    if rejected_m:
        docs.append({**base, "sender_type": "TRAIN", "content": rejected_m})
    return docs

class ManualTrainPipeline:
    """
    - CloseAI 배열 입력: masking_message 저장 → 표준화 → Judge → (통과건) Main LLM 전달
    - 표준 {items:[...]} 입력: Judge 통과건 마스킹 → masking_message 업서트 → Main LLM 전달
    """
    def __init__(self,
                 mongo: MongoReader,
                 judge: JudgeClient,
                 masker: SensitiveMasker,
                 main_llm: Optional[MainLlmClient] = None,
                 eco_repo: Optional[EcoPromptRepository] = None):
        self.mongo = mongo
        self.judge = judge
        self.masker = masker
        self.main_llm = main_llm
        self.eco_repo = eco_repo

    async def run(self, payload: Dict[str, Any] | List[Dict[str, Any]]) -> Dict[str, Any]:
        if isinstance(payload, list):
            # CloseAI 배열: 원문 마스킹 후 masking_message 저장
            if self.eco_repo:
                try:
                    masked_docs = build_masked_original_docs(payload, self.masker)
                    _ = await self.eco_repo.upsert_or_insert_many(masked_docs)
                except Exception as e:
                    print(f"[EcoPrompt] masking_message 저장 실패: {e}")
            norm_items = normalize_closeai_messages(payload)
            batch_id = f"closeai-{int(datetime.utcnow().timestamp())}"
            return await self._run_standard({"batchId": batch_id, "items": norm_items})

        if not isinstance(payload, dict) or "items" not in payload:
            raise ValueError("Invalid payload: expected dict with 'items' or CloseAI array.")
        return await self._run_standard(payload)

    async def _run_standard(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        batch_id: str = str(payload.get("batch_id") or payload.get("batchId") or "default")
        items: List[Dict[str, Any]] = list(payload.get("items") or [])
        if not items:
            raise ValueError("Empty 'items'.")

        use_total  = os.getenv("JUDGE_USE_TOTAL", "true").lower() == "true"
        thr_final  = float(os.getenv("JUDGE_FINAL_THRESHOLD", "3.5"))
        thr_total  = int(os.getenv("JUDGE_PASS_MIN_TOTAL", "75"))
        debug_subs = os.getenv("JUDGE_DEBUG_RETURN_SUBSCORES", "false").lower()=="true"
        strict_rec = os.getenv("JUDGE_STRICT_RECOVERED", "false").lower()=="true"

        results: List[Dict[str, Any]] = []
        to_train: List[Dict[str, Any]] = []
        masking_docs_bulk: List[Dict[str, Any]] = []
        success_eval = 0

        for row in items:
            try:
                message_id, prompt, llm_resp, rejected = _norm_item(row)
                eval_answer = llm_resp or rejected or ""

                jres = await self.judge.evaluate(prompt=prompt, answer=eval_answer)
                try:
                    norm = normalize_judge_json(jres.get("raw", jres))
                except Exception as e:
                    norm = normalize_judge_json({"final_score": 3.0, "feedback": f"normalize-recovered: {e}"})

                final_score = float(getattr(norm, "final_score", 0.0) or 0.0)
                total = int(getattr(norm, "total", 0) or 0)

                _trainable = (total >= thr_total) if use_total else (final_score >= thr_final)
                if strict_rec and getattr(norm, "recovered", False):
                    _trainable = False
                passed = _trainable

                if passed:
                    prompt_m   = self.masker.mask(prompt)
                    llm_resp_m = self.masker.mask(llm_resp)
                    rejected_m = self.masker.mask(rejected)

                    # ✅ masking_message 업서트용 문서 적재 (USER/AI/TRAIN)
                    masking_docs_bulk.extend(
                        build_masked_docs_for_standard(batch_id, message_id, prompt_m, llm_resp_m, rejected_m)
                    )

                    # 메인 LLM 전달용
                    to_train.append({
                        "message_id": message_id,
                        "prompt": prompt_m,
                        "llm_response": llm_resp_m,
                        "rejected_response": rejected_m
                    })

                item_res = {"message_id": message_id, "total": total, "final_score": final_score, "passed": passed}
                print(f"[JudgeParsed] mid={message_id} total={total} final={final_score} passed={passed}")
                print(f"[JudgeRawJSON] mid={message_id} raw={getattr(norm,'__dict__',norm)}")
                if debug_subs and getattr(norm, "subscores", None):
                    subs = getattr(norm, "subscores")
                    item_res["subscores"] = getattr(subs, "model_dump", lambda: subs)()
                results.append(item_res)
                success_eval += 1

            except Exception as e:
                results.append({"message_id": row.get("message_id"), "error": str(e), "status": "FAILED_EVAL"})

        # ✅ 표준 배치 통과건을 masking_message에 일괄 업서트
        if masking_docs_bulk and self.eco_repo:
            try:
                _ = await self.eco_repo.upsert_or_insert_many(masking_docs_bulk)
            except Exception as e:
                results.append({"error": f"MASKING_MESSAGE_UPSERT_FAILED: {e}"})

        # ✅ 메인 LLM 트리거
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
            # train_dataset 제거 — 응답 필드는 0 고정
            "upserted": 0,
            "upsert_failed": 0,
            "main_llm_triggered": triggered,
            "main_llm_ack": ack,
            "main_llm_error": err,
            "results": results,
        }
