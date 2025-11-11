import json

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
                "clarityScore", 
                "specificityScore", 
                "formatScore", 
                "safetyScore"
            ],
            "properties": {
                "clarityScore": {"type": "number"},
                "specificityScore": {"type": "number"},
                "formatScore": {"type": "number"},
                "safetyScore": {"type": "number"},
            }
        }
    }
}
