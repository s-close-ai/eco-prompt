import json
import random

# ✅ 경로 설정 (원하는 경로/파일명으로 바꿔줘)
INPUT_PATH = r"C:\Users\SSAFY\Desktop\jp\processed_dataset.jsonl"
TRAIN_PATH = r"C:\Users\SSAFY\Desktop\jp\train_dataset.jsonl"
VALID_PATH = r"C:\Users\SSAFY\Desktop\jp\valid_dataset.jsonl"
TEST_PATH  = r"C:\Users\SSAFY\Desktop\jp\test_dataset.jsonl"

# ✅ 비율 설정 (합이 1.0 이하면 마지막은 나머지로 자동)
TRAIN_RATIO = 0.8
VALID_RATIO = 0.1   # test는 자동으로 0.1

SEED = 42  # 재현성을 위해 고정


def split_jsonl(
    input_path: str,
    train_path: str,
    valid_path: str,
    test_path: str,
    train_ratio: float = 0.8,
    valid_ratio: float = 0.1,
    seed: int = 42,
):
    # 1) 전체 라인 읽기
    with open(input_path, "r", encoding="utf-8") as f:
        lines = [line for line in f if line.strip()]

    n = len(lines)
    print(f"총 레코드 수: {n}")

    # 2) 섞기
    rnd = random.Random(seed)
    rnd.shuffle(lines)

    # 3) 개수 계산
    n_train = int(n * train_ratio)
    n_valid = int(n * valid_ratio)
    n_test = n - n_train - n_valid

    train_lines = lines[:n_train]
    valid_lines = lines[n_train:n_train + n_valid]
    test_lines  = lines[n_train + n_valid:]

    print(f"train: {len(train_lines)}")
    print(f"valid: {len(valid_lines)}")
    print(f"test : {len(test_lines)}")

    # 4) 각각 JSONL로 저장
    with open(train_path, "w", encoding="utf-8") as f:
        for line in train_lines:
            f.write(line if line.endswith("\n") else line + "\n")

    with open(valid_path, "w", encoding="utf-8") as f:
        for line in valid_lines:
            f.write(line if line.endswith("\n") else line + "\n")

    with open(test_path, "w", encoding="utf-8") as f:
        for line in test_lines:
            f.write(line if line.endswith("\n") else line + "\n")

    print("✅ 분리 완료")
    print(f"- train: {train_path}")
    print(f"- valid: {valid_path}")
    print(f"- test : {test_path}")


split_jsonl(
    INPUT_PATH,
    TRAIN_PATH,
    VALID_PATH,
    TEST_PATH,
    TRAIN_RATIO,
    VALID_RATIO,
    SEED,
)
