import ijson

PATH = "conversations.json"

last_convo = None

with open(PATH, "r", encoding="utf-8") as f:
    # 스트리밍으로 전체를 돌지만, 마지막 항목만 남김
    for convo in ijson.items(f, "item"):
        last_convo = convo

# 이제 마지막 대화 출력
if last_convo:
    title = last_convo.get("title", "제목 없음")
    create_time = last_convo.get("create_time", "시간 없음")
    print(f"[LAST] {title} ({create_time})")

    mapping = last_convo.get("mapping", {})
    for msg_id, msg_data in list(mapping.items())[-10:]:  # 마지막 메시지 10개만
        message = msg_data.get("message")
        if not message:
            continue

        author = message.get("author", {}).get("role", "unknown")
        content = message.get("content", {})
        parts = content.get("parts", [])
        if not parts:
            continue

        first = parts[0]
        text = first if isinstance(first, str) else str(first)
        print(f"  - {author}: {text[:100]}...")
else:
    print("⚠️ 대화를 하나도 찾지 못했어요.")
