import json

input_path = "/Users/ssafy/S13P31A309/judge_prompt/labeled_dataset.jsonl"
output_path = "/Users/ssafy/S13P31A309/judge_prompt/wo_colon_labeled_dataset.jsonl"


def is_non_empty_str(x):
    """공백만 있는 문자열, None, 문자열이 아닌 타입은 False"""
    return isinstance(x, str) and x.strip() != ""


def has_valid_scores(score_info):
    """labels.scoreInfo 안에 4개 점수가 모두 정상 숫자인지 체크"""
    if not isinstance(score_info, dict):
        return False

    # 오타 주의! specificityScore
    required_keys = ["clarityScore", "specificityScore", "formatScore", "safetyScore"]

    for key in required_keys:
        if key not in score_info:
            return False

        val = score_info[key]

        if val is None:
            return False

        if isinstance(val, str):
            val = val.strip()
            if val == "":
                return False
            try:
                float(val)
            except ValueError:
                return False
        elif not isinstance(val, (int, float)):
            return False

    return True


def is_valid_item(item):
    """id, question, labels.summary, labels.scoreInfo, 콜론 끝 여부까지 검증"""

    # id
    if not is_non_empty_str(item.get("id")):
        return False

    # question
    question = item.get("question")
    if not is_non_empty_str(question):
        return False

    # labels 구조
    labels = item.get("labels")
    if not isinstance(labels, dict):
        return False

    # summary 비어있는지 체크
    summary = labels.get("summary")
    if not is_non_empty_str(summary):
        return False

    # scoreInfo 구조/값 체크
    score_info = labels.get("scoreInfo")
    if not has_valid_scores(score_info):
        return False

    # question이 콜론으로 끝나는지 (잘린 프롬프트)
    q_stripped = question.strip()
    if q_stripped.endswith(":") or q_stripped.endswith("："):
        return False

    return True


def clean_dataset(input_path, output_path):
    total = 0
    kept = 0
    removed_colon = 0
    removed_invalid = 0

    with open(input_path, "r", encoding="utf-8") as infile, \
         open(output_path, "w", encoding="utf-8") as outfile:

        for line in infile:
            if not line.strip():
                continue

            total += 1
            item = json.loads(line)

            question = item.get("question", "")
            q_stripped = question.strip() if isinstance(question, str) else ""

            # 1) 콜론으로 끝나는 것 먼저 카운트
            if isinstance(question, str) and (q_stripped.endswith(":") or q_stripped.endswith("：")):
                removed_colon += 1
                continue

            # 2) 나머지 값/구조 검증
            if not is_valid_item(item):
                removed_invalid += 1
                continue

            # 3) 통과한 것만 저장
            outfile.write(json.dumps(item, ensure_ascii=False) + "\n")
            kept += 1

    print("처리 완료")
    print(f"총 레코드 수: {total}")
    print(f"- 콜론으로 끝나서 제거된 개수: {removed_colon}")
    print(f"- 값/구조 이상으로 제거된 개수: {removed_invalid}")
    print(f"- 최종 남은 레코드 수: {kept}")
    print(f"출력 파일: {output_path}")


clean_dataset(input_path, output_path)
