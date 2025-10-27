from llama_cpp import LlamaGrammar

JUDGE_OBJECT_GRAMMAR_TEXT = r"""
root ::= obj
obj ::= "{" ws
        "\"summary\"" ws ":" ws string ws "," ws
        "\"scoreInfo\"" ws ":" ws score_obj
       ws "}"
score_obj ::= "{" ws
        "\"clarityScore\"" ws ":" ws number ws "," ws
        "\"clarityReason\"" ws ":" ws string ws "," ws
        "\"specificityScore\"" ws ":" ws number ws "," ws
        "\"specificityReason\"" ws ":" ws string ws "," ws
        "\"formatScore\"" ws ":" ws number ws "," ws
        "\"formatReason\"" ws ":" ws string ws "," ws
        "\"safetyScore\"" ws ":" ws number ws "," ws
        "\"safetyReason\"" ws ":" ws string
       ws "}"
string ::= "\"" characters "\""
characters ::= character*
character ::= [^"\\] | escape
escape ::= "\\" (["\\/bfnrt] | unicode)
unicode ::= "u" HEX HEX HEX HEX
number ::= int frac? exp?
int ::= "-"? ("0" | [1-9] [0-9]*)
frac ::= "." [0-9]+
exp ::= [eE] [+-]? [0-9]+
ws ::= ([ \t\n\r])*
HEX ::= [0-9a-fA-F]
"""
JUDGE_OBJECT_GRAMMAR = LlamaGrammar.from_string(JUDGE_OBJECT_GRAMMAR_TEXT)
