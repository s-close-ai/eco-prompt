import json

input_path = "korquad_labeled_stream.jsonl"
output_path = "korquad_labeled_stream_with_source.jsonl"

with open(input_path, "r", encoding="utf-8") as fin, open(output_path, "w", encoding="utf-8") as fout:
    for line in fin:
        item = json.loads(line)
        if "source" not in item:
            item["source"] = "korquad"
        fout.write(json.dumps(item, ensure_ascii=False) + "\n")

print(f"완료: {output_path}에 source 필드 추가됨")