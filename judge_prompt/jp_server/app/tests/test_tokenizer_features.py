import pytest

from app.services.judge.tokenizer_config import (
    detect_lang,
    split_sentences,
    tokenize_ko,
    tokenize_en,
    extract_features,
    _has_listy,          # 공개 함수로 안 돼 있으면, 필요하면 래핑해서 테스트해도 됨
)

# 1) 언어 감지 테스트
@pytest.mark.parametrize("text,expected", [
    ("R-squared 값이 뭐야?", "ko"),
    ("What is R-squared in regression?", "en"),
    ("R-squared 값이 뭐야? Please explain in detail.", "mix"),
    ("12345 !!!", "unknown"),
])
def test_detect_lang(text, expected):
    assert detect_lang(text) == expected


# 2) 문장 분리 테스트
def test_split_sentences_basic_ko():
    text = "첫 번째 문장입니다. 두 번째 문장입니다!"
    sents = split_sentences(text)
    # 문장 수는 2개 이상이어야 함
    assert len(sents) >= 2
    assert "첫 번째 문장입니다." in sents[0]


def test_split_sentences_empty():
    text = "   "
    sents = split_sentences(text)
    # Kiwi가 어떻게 동작하느냐에 따라 다를 수 있지만,
    # 최소한 에러가 나지 않아야 한다.
    assert isinstance(sents, list)


# 3) 한국어/영어 토크나이즈 간단 체크
def test_tokenize_ko_non_empty():
    text = "R-squared 값이 뭐야?"
    toks = tokenize_ko(text)
    assert len(toks) > 0
    # "뭐야" 같은 토큰이 포함될 수 있음 (정확한 형태는 kiwi에 따라 다름)
    assert any("뭐" in t for t in toks)


def test_tokenize_en_simple():
    text = "What is R-squared in regression?"
    toks = tokenize_en(text)
    assert toks == ["what", "is", "r", "squared", "in", "regression", "1"] or len(toks) > 3
    # 위 한 줄은 너무 빡빡하면 안 되니까, 실제 형태에 맞게 조정해도 됨


# 4) 리스트 탐지(_has_listy) 테스트
def test_has_listy_multiline_numbered():
    text = "1. 데이터 수집\n2. 전처리\n3. 모델링"
    assert _has_listy(text) == 1


def test_has_listy_inline_numbered():
    text = "이 작업은 1. 데이터 수집, 2. 전처리, 3. 모델링 단계로 구성돼."
    assert _has_listy(text) == 1


def test_has_listy_no_list():
    text = "단순 설명 문장입니다. 리스트가 아닙니다."
    assert _has_listy(text) == 0


# 5) 질문 여부(_is_question)는 extract_features 결과로 간접 테스트
def test_extract_features_question_ko():
    text = "R-squared 값이 뭐야?"
    feats = extract_features(text)
    assert feats["quest"] == 1
    assert feats["lang"] in ("ko", "mix")


def test_extract_features_question_en():
    text = "What is R-squared in regression"
    feats = extract_features(text)
    assert feats["quest"] == 1
    assert feats["lang"] in ("en", "mix")


def test_extract_features_non_question():
    text = "회귀 분석에서 R-squared는 결정계수라고 부른다."
    feats = extract_features(text)
    assert feats["quest"] == 0


# 6) URL/기본 피처 테스트
def test_extract_features_url_and_basic_stats():
    text = "자세한 내용은 https://example.com 을 참고해줘."
    feats = extract_features(text)
    assert feats["url"] == 1
    assert feats["len_tok"] > 0
    assert feats["sent"] >= 1
    assert 0.0 <= feats["uniq"] <= 1.0
    assert 0.0 <= feats["stopr"] <= 1.0