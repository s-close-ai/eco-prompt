JUDGE_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["summary", "scoreInfo"],
    "properties": {
        "summary": {"type": "string"},
        "scoreInfo": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "clarityScore", "clarityReason",
                "specificityScore", "specificityReason",
                "formatScore", "formatReason",
                "safetyScore", "safetyReason"
            ],
            "properties": {
                "clarityScore": {"type": "number"},
                "clarityReason": {"type": "string"},
                "specificityScore": {"type": "number"},
                "specificityReason": {"type": "string"},
                "formatScore": {"type": "number"},
                "formatReason": {"type": "string"},
                "safetyScore": {"type": "number"},
                "safetyReason": {"type": "string"}
            }
        }
    }
}