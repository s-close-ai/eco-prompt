import ijson
import itertools

PATH = "conversations.json"  # 파일 이름/경로 맞게 수정

print("JSON 구조 앞 부분 50개 이벤트만 출력...\n")

with open(PATH, "r", encoding="utf-8") as f:
    parser = ijson.parse(f)

    for prefix, event, value in itertools.islice(parser, 50):
        print(f"prefix={prefix!r}, event={event!r}, value={repr(value)[:60]}")

print("\n✅ 끝!")
