# judge_llm/tests/generate_samples.py
# masking 테스트데이터 생성기 (노이즈/컨텍스트 강화 버전)
import random, re, json, pathlib, uuid

R = random.Random(42)

NAMES = ["김재희","이권민","김주혜","성수린","오승연","조현지"]
DOMAINS = ["example.com","naver.com","gmail.com","kakao.com","ssafy.kr"]
PROVINCES = ["서울특별시","부산광역시","경기도","인천광역시","대전광역시","세종특별자치시","제주특별자치도"]
GUGUN = ["강남구","서초구","송파구","마포구","해운대구","영통구","분당구","수원시"]
RO_GIL = ["테헤란로","중앙로","영통로","센텀동로","가로수길","삼성로","판교로","광안로"]
BANKS = ["국민은행","신한은행","우리은행","하나은행","농협","기업은행","토스뱅크","카카오뱅크","수협","SC제일은행"]

# -----------------------
# 기본 랜덤 PII 생성기들
# -----------------------
def rnd_phone():
    if R.random()<0.6:
        return f"010-{R.randint(1000,9999)}-{R.randint(1000,9999)}"
    elif R.random()<0.8:
        return f"010{R.randint(10000000,99999999)}"
    else:
        area = R.choice(["02","031","051","053","062"])
        return f"{area}-{R.randint(300,9999)}-{R.randint(1000,9999)}"

def rnd_rrn():
    s1 = f"{R.randint(50,99):02}{R.randint(1,12):02}{R.randint(1,28):02}"
    s2 = f"{R.randint(1,4)}{R.randint(0,999999):06}"
    return s1 + "-" + s2 if R.random()<0.7 else s1 + s2

def rnd_email():
    local = R.choice(["john.doe","dx_jh","user.name","data-team","contact"])
    if R.random()<0.3:
        return f"{local}(at){R.choice(DOMAINS).replace('.', '(dot)')}"
    return f"{local}@{R.choice(DOMAINS)}"

def rnd_addr():
    prov = R.choice(PROVINCES)
    gu = R.choice(GUGUN)
    road = R.choice(RO_GIL)
    num = f"{R.randint(1,400)}{('-'+str(R.randint(1,80))) if R.random()<0.3 else ''}"
    zip5 = f"{R.randint(1,9)}{R.randint(0,9)}{R.randint(0,9)}{R.randint(0,9)}{R.randint(1,9)}"
    return f"{prov} {gu} {road} {num} ({zip5})"

def rnd_card():
    if R.random()<0.7:
        return f"{R.randint(4000,4999)}-{R.randint(1000,9999)}-{R.randint(1000,9999)}-{R.randint(1000,9999)}"
    return "".join(str(R.randint(0,9)) for _ in range(R.randint(13,19)))

def rnd_secret():
    p = R.random()
    if p<0.2:  # AWS Access Key
        return "AKIA" + "".join(R.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(16))
    if p<0.35:  # GCP
        return "AIza" + "".join(R.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_") for _ in range(35))
    if p<0.5:  # JWT
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "a"*16 + "." + "b"*16
    if p<0.65:  # UUID
        return str(uuid.uuid4())
    if p<0.8:  # Git SHA
        s = "".join(R.choice("0123456789abcdef") for _ in range(R.randint(7,40)))
        if re.fullmatch(r"\d+", s): s = "a"+s[1:]  # 영문 1자 이상 강제
        return s
    # API token (고엔트로피 후보)
    return "".join(R.choice("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_") for _ in range(R.randint(22,40)))

def rnd_ip():
    if R.random() < 0.7:  # IPv4
        return ".".join(str(R.randint(1,255)) for _ in range(4))
    else:  # IPv6
        return ":".join(f"{R.randint(0,65535):x}" for _ in range(8))

def rnd_bank():
    bank = R.choice(BANKS)
    acct = f"{R.randint(100,999)}-{R.randint(10,99)}-{R.randint(100000,999999)}"
    # 은행/계좌 컨텍스트 동반
    return f"{bank} 계좌번호 {acct}"

def _bizno_checksum(base9):
    w = [1,3,7,1,3,7,1,3,5]
    s = sum(base9[i]*w[i] for i in range(9))
    s += (base9[8]*5)//10
    check = (10 - (s % 10)) % 10
    return check

def rnd_bizno(valid=True):
    base = [R.randint(0,9) for _ in range(9)]
    check = _bizno_checksum(base)
    if not valid:  # 의도적 무효
        check = (check + R.randint(1,9)) % 10
    digits = "".join(map(str, base)) + str(check)
    return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}" if R.random()<0.7 else digits

def rnd_secret_ext():
    t = R.random()
    if t < 0.33:
        return f"password={R.choice(['abcd1234','MyPass!23','Secr3t!'])}"
    elif t < 0.66:
        tok = ''.join(R.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') for _ in range(24))
        return f"token={tok}"
    else:
        return f"Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

def build_noise_snippets():
    s = []
    # 코드 조각
    s.append(f'cfg = {{"password":"MyPass!23","host":"{rnd_ip()}","token":"{"".join(R.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") for _ in range(60))}"}}')
    # 로그 라인
    s.append(f'INFO auth: Authorization: Bearer eyJhbGciOiJIUzI1NiIs... from {rnd_ip()} accepted')
    # JSON 설정
    s.append('{"db":"prod","api_key":"%s"}' % ''.join(R.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") for _ in range(56)))
    return " | ".join(s)

# -----------------------
# 컨텍스트(외피) 템플릿
# -----------------------
def wrap_py(s):   return f'# comment: masking test\nAPI_KEY="{rnd_secret()}"\nEMAIL="{rnd_email()}"\ntext="{s}"\nprint(text)\n'
def wrap_js(s):   return f'// TODO: sanitize\nconst cfg={{token:"{rnd_secret()}"}};\nconst msg=`{s}`;\nconsole.log(msg);\n'
def wrap_log(s):  return f'2025-10-30T09:12:33Z INFO request_id={uuid.uuid4()} msg="{s}" ip={rnd_ip()} user=ssafy\n'
def wrap_json(s): return json.dumps({"msg": s, "email": rnd_email(), "ip": rnd_ip(), "token": rnd_secret()}, ensure_ascii=False)
def wrap_yaml(s): return f'msg: "{s}"\nnotify:\n  email: {rnd_email()}\n  ip: {rnd_ip()}\n  bearer: "Authorization: Bearer eyJ..." \n'
def wrap_sql(s):  return f"-- pii check\nINSERT INTO logs(message,ip) VALUES ('{s}', '{rnd_ip()}');\n"
def wrap_sh(s):   return f'#!/usr/bin/env bash\nexport PASSWORD="{R.choice(["Secr3t!","Abcd1234!"])}"\necho "{s}" | tee /tmp/pii.txt\n'
def wrap_md(s):   return f'### 테스트 문서\n- 내용: {s}\n- 관리자 토큰: `{rnd_secret()}`\n'
def wrap_html(s): return f'<!-- masking demo --><div data-ip="{rnd_ip()}">{s}</div>'
WRAPPERS = [wrap_py, wrap_js, wrap_log, wrap_json, wrap_yaml, wrap_sql, wrap_sh, wrap_md, wrap_html]

# -----------------------
# 하나의 레코드를 조립
# -----------------------
def build_core():
    # 코어 메시지: 다양한 PII를 한 문장에 포함
    parts = [
        f"이름: {R.choice(NAMES)}",
        f"연락처: {rnd_phone()}",
        f"주민: {rnd_rrn()}",
        f"주소: {rnd_addr()}",
        f"이메일: {rnd_email()}",
        f"카드: {rnd_card()}",
        f"시크릿: {rnd_secret()}",
        f"IP: {rnd_ip()}",
        f"{rnd_bank()}",
        # 유효/무효 사업자번호 8:2 혼합 (무효는 기대: 비탐지)
        f"사업자등록번호 {rnd_bizno(valid=R.random()<0.8)}",
        f"{rnd_secret_ext()}",
        "랜덤토큰:" + ''.join(R.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") for _ in range(60)),
        build_noise_snippets(),
    ]
    return " / ".join(parts)

def build_sample():
    core = build_core()
    # 70%는 일반 문장, 30%는 무작위 컨텍스트 래핑
    if R.random() < 0.30:
        return R.choice(WRAPPERS)(core)
    return core

def main(n=1000, out="tests/samples.jsonl"):
    path = pathlib.Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for _ in range(n):
            f.write(json.dumps({"text": build_sample()}, ensure_ascii=False)+"\n")
    print(f"Wrote {n} samples -> {out}")

if __name__ == "__main__":
    main()
