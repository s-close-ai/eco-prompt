# test_split_sentences.py
import pytest
from app.services.judge.tokenizer_config import split_sentences

def test_split_sentences_basic():
    """기본 문장 분리 테스트"""
    text = "파이썬과 자바의 차이. 특징과 장단점을 비교해서 표로 정리해줘"
    result = split_sentences(text)
    
    assert isinstance(result, list)
    assert len(result) > 0
    print(f"\n결과: {result}")

def test_split_sentences_multiple():
    """여러 문장 테스트"""
    text = "첫 번째 문장. 두 번째 문장! 세 번째 문장?"
    result = split_sentences(text)
    
    assert len(result) == 3
    assert result[0] == "첫 번째 문장."

if __name__ == "__main__":
    # pytest 없이도 실행 가능
    test_split_sentences_basic()
    test_split_sentences_multiple()