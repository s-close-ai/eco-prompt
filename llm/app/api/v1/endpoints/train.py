from fastapi import APIRouter
import torch
import os

from app.core.config import base_settings
from app.schemas.train import TrainRequest, TrainResponse
from app.services.dpo_train import train_model
from app.services.load_dpo_datasets import process_training_data
from app.services.evaluate import evaluate_model

router = APIRouter()

@router.post("/", response_model=TrainResponse, status_code=200)
async def train(request: TrainRequest):
    """모델 학습하기"""

    if request.start_training:
        # 학습할 모델 가져오기
        target_version_number = len(os.listdir(base_settings.base_model))
        target_model_path = base_settings.base_model + f"/v_{target_version_number:03d}"

        os.rename(base_settings.base_model + "/v_latest", base_settings.base_model + f"/v_{target_version_number:03d}")
        os.makedirs(base_settings.base_model + "/v_latest", exist_ok=True)

        print(f"학습할 모델: {target_model_path}")

    # 마스킹 처리한 데이터 받기
    training_dataset = request.training_data

    # 데이터 처리
    final_dataset = process_training_data(training_dataset)

    try:
        train_model(target_model_path, final_dataset)
        
        print("[COMPLETED] 모델 학습 완료")
        
        try:
            # 모델 성능평가 => HAERAE Benchmark 사용하기
            result = evaluate_model(base_settings.base_model)

            return {"is_completed": result}
        
        except Exception as e:
            print(f"[ERROR] {e}")
    
    except RuntimeError as e:
        if "out of memory" in str(e):
            torch.cuda.empty_cache()
            print("⚠️ GPU 메모리 부족 → 배치/길이 줄이기")
            return {"is_completed": False}
        
        elif "device-side assert triggered" in str(e):
            print("⚠️ CUDA Assert 발생 → 데이터셋 인덱스나 라벨 확인하기")
            return {"is_completed": False}

        elif "Tokenizer" in str(e):
            print("⚠️ Tokenizer 문제 → pad_token 설정 확인.")
            return {"is_completed": False}

        else:
            print(f"🚨 Unknown RuntimeError: {e}")
            return {"is_completed": False}
        
    except ValueError as e:
        print(f"⚠️ ValueError: {e}")
        return {"is_completed": False}
    
    except Exception as e:
        print(f"🚨 Unexpected error: {type(e).__name__}: {e}")
        return {"is_completed": False}