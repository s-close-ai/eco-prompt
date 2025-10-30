# judge_llm/tests/generate_samples.py
# masking 테스트데이터 생성기 (Presidio-KO 전용)
import random, re, json, pathlib, uuid

R = random.Random(42)

NAMES = ["김재희","이권민","김주혜","성수린","오승연","조현지"]
DOMAINS = ["example.com","naver.com","gmail.com","kakao.com","ssafy.kr"]
PROVINCES = ["서울특별시","부산광역시","경기도","인천광역시","대전광역시","세종특별자치시","제주특별자치도"]
GUGUN = ["강남구","서초구","송파구","마포구","해운대구","영통구","분당구","수원시"]
RO_GIL = ["테헤란로","중앙로","영통로","센텀동로","가로수길","삼성로","판교로","광안로"]

BANKS = ["국민은행","신한은행","우리은행","하나은행","농협","기업은행","토스뱅크","카카오뱅크","수협","SC제일은행"]
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
        if re.fullmatch(r"\d+", s): s = "a"+s[1:]
        return s
    # API token
    return "".join(R.choice("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_") for _ in range(R.randint(22,40)))

# 신규: IP / 계좌 / 사업자번호 / 시크릿 확장
def rnd_ip():
    if R.random() < 0.7:  # IPv4
        return ".".join(str(R.randint(1,255)) for _ in range(4))
    else:  # IPv6
        return ":".join(f"{R.randint(0,65535):x}" for _ in range(8))

def rnd_bank():
    bank = R.choice(BANKS)
    acct = f"{R.randint(100,999)}-{R.randint(10,99)}-{R.randint(100000,999999)}"
    return f"{bank} 계좌번호 {acct}"

def rnd_bizno(valid=True):
    base = [R.randint(0,9) for _ in range(9)]
    w = [1,3,7,1,3,7,1,3,5]
    s = sum(base[i]*w[i] for i in range(9))
    s += (base[8]*5)//10
    check = (10 - (s % 10)) % 10
    if not valid:
        check = (check + R.randint(1,9)) % 10
    digits = "".join(map(str, base)) + str(check)
    return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}" if R.random()<0.7 else digits

def rnd_secret_ext():
    t = R.random()
    if t < 0.33:
        return f"password={R.choice(['abcd1234','MyPass!23','Secr3t!'])}"
    elif t < 0.66:
        return f"token={''.join(R.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') for _ in range(24))}"
    else:
        return f"Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

def build_sample():
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
        f"사업자등록번호 {rnd_bizno(valid=True)}",
        f"{rnd_secret_ext()}",
    ]
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
