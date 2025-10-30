# judge_llm/tests/generate_samples.py
# masking 테스트데이터 생성기 데이터
import random, re, json, pathlib

R = random.Random(42)

NAMES = ["김재희","이권민","김주혜","성수린","오승연","조현지"]
DOMAINS = ["example.com","naver.com","gmail.com","kakao.com","ssafy.kr"]
PROVINCES = ["서울특별시","부산광역시","경기도","인천광역시","대전광역시","세종특별자치시","제주특별자치도"]
GUGUN = ["강남구","서초구","송파구","마포구","해운대구","영통구","분당구","수원시"]
RO_GIL = ["테헤란로","중앙로","영통로","센텀동로","가로수길","삼성로","판교로","광안로"]

def rnd_phone():
    if R.random()<0.6:
        return f"010-{R.randint(1000,9999)}-{R.randint(1000,9999)}"
    elif R.random()<0.8:
        return f"010{R.randint(10000000,99999999)}"
    else:
        area = R.choice(["02","031","051","053","062"])
        mid = R.randint(300,9999)
        end = R.randint(1000,9999)
        return f"{area}-{mid}-{end}"

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
    if p<0.2:  # AWS Access
        return "AKIA" + "".join(R.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") for _ in range(16))
    if p<0.35:  # GCP
        return "AIza" + "".join(R.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_") for _ in range(35))
    if p<0.5:  # JWT
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "a"*16 + "." + "b"*16
    if p<0.65:  # Git SHA
        L = R.randint(7, 40)
        s = "".join(R.choice("0123456789abcdef") for _ in range(L))
        if re.fullmatch(r"\d+", s): s = "a"+s[1:]  # 한 글자 이상 영문
        return s
    if p<0.8:  # UUID
        import uuid
        return str(uuid.uuid4())
    # API 토큰
    return "".join(R.choice("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_") for _ in range(R.randint(22,40)))

def build_sample():
    parts = []
    parts.append(f"이름: {R.choice(NAMES)}")
    parts.append(f"연락처: {rnd_phone()}")
    parts.append(f"주민: {rnd_rrn()}")
    if R.random()<0.8:
        parts.append(f"주소: {rnd_addr()}")
    parts.append(f"이메일: {rnd_email()}")
    parts.append(f"카드: {rnd_card()}")
    parts.append(f"시크릿: {rnd_secret()}")
    return " / ".join(parts)

def main(n=1000, out="tests/samples.jsonl"):
    path = pathlib.Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for _ in range(n):
            f.write(json.dumps({"text": build_sample()}, ensure_ascii=False)+"\n")
    print(f"Wrote {n} samples -> {out}")

if __name__ == "__main__":
    main()
