# judge_prompts.py
# 레퍼런스 기반 Judge 프롬프트 + (옵션) 쌍대비교 프롬프트

JUDGE_SYSTEM = (
    "당신은 채점관(Judge)입니다. 아래 '문항'과 '정답(참조용)', 그리고 '정답후보'를 보고 "
    "후보가 정답과 의미적으로 얼마나 일치하는지 평가하세요.\n"
    "오로지 JSON만 출력합니다. 추가 텍스트 금지.\n"
    '{ "score": <0..10 정수>, "correct": <true|false>, "reason": "<짧은 한국어 이유>" }\n'
    "- score: 0(완전 오답) ~ 10(완전 정답)\n"
    "- correct: 최종 판정 (정답이면 true, 아니면 false)\n"
    "- 반드시 JSON만 출력하세요."
)

def build_mc_prompt(question: str, options_map: dict[int, str], reference_answer_text: str, candidate: str) -> str:
    opts = "\n".join([f"{i}) {options_map[i]}" for i in sorted(options_map)])
    return (
        f"{JUDGE_SYSTEM}\n\n"
        "문항(객관식):\n"
        f"{question}\n\n"
        "보기:\n"
        f"{opts}\n\n"
        "정답(참조용):\n"
        f"{reference_answer_text}\n\n"
        "정답후보(모델 출력):\n"
        f"{candidate}\n\n"
        "평가 JSON만 출력:"
    )

def build_qa_prompt(question: str, reference_answer_text: str, candidate: str) -> str:
    return (
        f"{JUDGE_SYSTEM}\n\n"
        "문항(주관식):\n"
        f"{question}\n\n"
        "정답(참조용):\n"
        f"{reference_answer_text}\n\n"
        "정답후보(모델 출력):\n"
        f"{candidate}\n\n"
        "평가 JSON만 출력:"
    )

# (옵션) 쌍대 비교용 프롬프트: 두 후보 중 어느 쪽이 더 정답에 가까운지 고르는 모드가 필요할 때 사용
PAIRWISE_SYSTEM = (
    "당신은 채점관(Judge)입니다. '문항'과 '정답(참조용)'을 보고, 두 후보(A/B) 중 더 정답에 가까운 쪽을 선택하세요.\n"
    "오로지 JSON만 출력합니다. 추가 텍스트 금지.\n"
    '{ "better": "A" | "B" | "tie", "reason": "<짧은 한국어 이유>" }'
)

def build_pairwise_prompt(question: str, reference_answer_text: str, cand_a: str, cand_b: str) -> str:
    return (
        f"{PAIRWISE_SYSTEM}\n\n"
        "문항:\n"
        f"{question}\n\n"
        "정답(참조용):\n"
        f"{reference_answer_text}\n\n"
        "후보 A:\n"
        f"{cand_a}\n\n"
        "후보 B:\n"
        f"{cand_b}\n\n"
        "평가 JSON만 출력:"
    )
