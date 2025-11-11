import json
import re

# 입력 / 출력 경로 설정
input_path = r"C:\Users\SSAFY\Desktop\jp\wo_colon_labeled_dataset.jsonl"
output_clean_path = r"C:\Users\SSAFY\Desktop\jp\processed_dataset.jsonl"


# 중국어/한자(漢字) 범위 정규식
RE_HAN = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]")

def has_chinese_or_hanja(text: str) -> bool:
    if not isinstance(text, str):
        return False
    return bool(RE_HAN.search(text))

def clean_zh_questions(input_path, output_clean_path):
    total = 0
    kept = 0
    removed_zh = 0

    with open(input_path, "r", encoding="utf-8") as infile, \
         open(output_clean_path, "w", encoding="utf-8") as out_clean: 
         

        for line in infile:
            if not line.strip():
                continue

            total += 1
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                # 형식 깨진 줄은 그냥 스킵
                continue

            q = item.get("question", "")
            if has_chinese_or_hanja(q):
                removed_zh += 1
                
                continue

            out_clean.write(json.dumps(item, ensure_ascii=False) + "\n")
            kept += 1

    print("처리 완료 ✅")
    print(f"- 총 레코드 수        : {total}")
    print(f"- 한자/중국어 포함 제거: {removed_zh}")
    print(f"- 최종 남은 레코드 수 : {kept}")
    print(f"- 클린 데이터 경로    : {output_clean_path}")


clean_zh_questions(input_path, output_clean_path)
