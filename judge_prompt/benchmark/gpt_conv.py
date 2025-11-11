import ijson

PATH = "conversations.json"

with open(PATH, "r", encoding="utf-8") as f:
    parser = ijson.items(f, "item")

    for i, convo in enumerate(parser):
        title = convo.get("title", "제목 없음")
        create_time = convo.get("create_time", "시간 없음")
        print(f"\n[{i+1}] {title} ({create_time})")

        mapping = convo.get("mapping", {})

        # 앞 메시지 몇 개만 맛보기
        for msg_id, msg_data in list(mapping.items())[:10]:
            message = msg_data.get("message")
            if not message:
                continue

            author = message.get("author", {}).get("role", "unknown")
            content = message.get("content", {})

            parts = content.get("parts", [])
            if not parts:
                text = ""
            else:
                first = parts[0]
                if isinstance(first, str):
                    text = first
                else:
                    # 문자열이 아니면 그냥 타입만 표시하거나 str로 변환
                    text = f"[non-text content: {type(first).__name__}]"

            # text가 비어있으면 굳이 출력 안 해도 됨
            if text:
                preview = text[:100]  # 이제 안전하게 슬라이스 가능
            else:
                preview = ""

            print(f"  - {author}: {preview}...")

        if i >= 4:  # 대화 5개까지만
            break
