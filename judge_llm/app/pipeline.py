# 트리거 진입점(오케스트레이터)
# judge/app/pipeline.py
from typing import Dict, Any, List
from .ports import MongoReader, JudgeClient, SensitiveMasker, TrainRepository

class ManualTrainPipeline:
    """
    '수동 AI 모델 학습' 트리거 진입점.
    - API 바디 스키마는 백엔드가 확정.
    - 여기서는 dict payload만 받아 내부 플로우를 오케스트레이션.
    """

    def __init__(self,
                 mongo: MongoReader,
                 judge: JudgeClient,
                 masker: SensitiveMasker,
                 repo: TrainRepository):
        self.mongo = mongo
        self.judge = judge
        self.masker = masker
        self.repo = repo

    async def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        payload 예: {'minScore': 70, 'batchId': 'one', ...}
        - 실제 키 이름은 백엔드 확정 후 매핑.
        """
        min_score = int(payload.get("minScore", 70))   # 임시 기본값
        batch_id  = payload.get("batchId", "default")  # 임시 기본값

        # 1) 기준 점수 이상 쌍 로드 (실제 구현은 미정)
        pairs = await self.mongo.fetch_pairs(min_score=min_score)

        results: List[Dict[str, Any]] = []
        rows_to_upsert: List[Dict[str, Any]] = []
        success = 0

        # 2) 평가 → 임계 이상만 마스킹 → 적재 후보 구성
        for p in pairs:
            try:
                prompt  = p.get("prompt", "")
                answer  = p.get("answer", "")
                pair_id = p.get("pair_id") or p.get("_id")

                eval_res = await self.judge.evaluate(prompt=prompt, answer=answer)
                score = int(eval_res.get("score", -1))  # 실제 키 확정 전

                if score >= min_score:
                    masked_prompt = self.masker.mask(prompt)
                    masked_answer = self.masker.mask(answer)

                    rows_to_upsert.append({
                        "batch_id": batch_id,
                        "pair_id": pair_id,
                        "prompt": prompt,
                        "answer": answer,
                        "prompt_masked": masked_prompt,
                        "answer_masked": masked_answer,
                        "score": score,
                        "feedback": eval_res.get("feedback"),
                        "trainable": True,  # 최종 기준은 스토리4에서 확정
                    })
                    results.append({"pair_id": pair_id, "score": score, "status": "QUEUED_FOR_UPSERT"})
                    success += 1
                else:
                    results.append({"pair_id": pair_id, "score": score, "status": "SKIPPED_LOW_SCORE"})
            except Exception as e:
                results.append({"pair_id": p.get("pair_id"), "error": str(e), "status": "FAILED_EVAL"})

        # 3) 적재 (구현 미정이어도 인터페이스는 고정)
        up_ok, up_fail = (0, 0)
        if rows_to_upsert:
            try:
                up_ok, up_fail = await self.repo.upsert_many(rows_to_upsert)
            except Exception as e:
                results.append({"error": f"UPSERT_FAILED: {e}"})

        return {
            "processed": len(results),
            "success": success,
            "failed": len([r for r in results if r.get("status", "").startswith("FAILED")]),
            "upserted": up_ok,
            "upsert_failed": up_fail,
            "results": results,
        }
