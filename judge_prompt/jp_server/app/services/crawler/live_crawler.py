from __future__ import annotations

from datetime import datetime, date
from typing import List, Optional, Dict

import re
import httpx
from bs4 import BeautifulSoup
from loguru import logger
from pydantic import BaseModel
from zoneinfo import ZoneInfo

from app.core.config import settings


KST = ZoneInfo("Asia/Seoul")


class LiveInfo(BaseModel):
    date: str              # "2025-11-10"
    start_time: str        # "09:00"
    end_time: str          # "10:00"
    subject: str
    category: str
    teacher: str
    classroom: str
    live_url: Optional[str] = None



async def fetch_curriculum_html(
    url: Optional[str] = None,
    cookies: Optional[Dict[str, str]] = None,
) -> str:
    """
    SSAFY 주차별 커리큘럼 페이지 HTML을 가져온다.

    - url 미지정 시 settings.SSAFY_CURRICULUM_WEEKLY_URL 사용
    - 로그인 세션이 필요하면 cookies 인자로 JSESSIONID 등 전달
    """
    target_url = url or settings.SSAFY_CURRICULUM_WEEKLY_URL
    logger.info(f"[crawler] fetching curriculum page: {target_url}")

    async with httpx.AsyncClient(timeout=10.0, cookies=cookies) as client:
        resp = await client.get(target_url)
        resp.raise_for_status()
        return resp.text


def _parse_date_text(date_text: str) -> date:
    """
    '2025.11.11(화)' 같은 문자열에서 date 객체로 변환.
    요일 정보는 버린다.
    """
    # 숫자/점만 남기기: '2025.11.11'
    m = re.search(r"\d{4}\.\d{2}\.\d{2}", date_text)
    if not m:
        raise ValueError(f"날짜 파싱 실패: {date_text!r}")
    pure = m.group(0)  # '2025.11.11'
    dt = datetime.strptime(pure, "%Y.%m.%d")
    return dt.date()


def _parse_time_range(time_text: str, d: date) -> tuple[datetime, Optional[datetime]]:
    """
    '09:00~10:00' 같이 시간 범위를 표현한 텍스트를
    같은 날짜의 start/end datetime으로 변환.
    """
    # 공백 제거
    time_text = time_text.strip()
    # 예: '09:00~10:00'
    parts = [p.strip() for p in time_text.split("~")]
    if not parts:
        raise ValueError(f"시간 파싱 실패: {time_text!r}")

    def to_dt(t: str) -> datetime:
        # HH:MM 기준
        tm = datetime.strptime(t, "%H:%M").time()
        return datetime(d.year, d.month, d.day, tm.hour, tm.minute, tzinfo=KST)

    start_dt = to_dt(parts[0])
    end_dt = to_dt(parts[1]) if len(parts) > 1 else None
    return start_dt, end_dt


def parse_live_infos_from_html(html: str) -> List[LiveInfo]:
    """
    주어진 HTML에서 'Youtube Live' 세션과 연결된 liveDirect 버튼 중
    실제 YouTube 링크(https://youtu...)를 가진 것들을 전부 추출한다.

    구조 기준:
    - ul.course#_crclmDayTargetId > li (각 li가 하루)
      - span.date : '2025.11.11(화)'
      - 여러 개의 <dl>
        - dt: '14:00~16:00'
        - dd.unit-box > div.info
            - span.subj : 강의 제목
            - span.class-room : 'Youtube Live'
        - dd.unit-box > div.btns > button.liveDirect[data-req]
            - text: '라이브 바로가기' or '강의 다시보기'
            - data-req: YouTube 링크 또는 다시보기 URL

    여기서는 data-req에 'youtu' 가 포함된 경우만 live_url로 간주한다.
    """
    soup = BeautifulSoup(html, "html.parser")
    course_ul = soup.select_one("ul.course#_crclmDayTargetId")
    if course_ul is None:
        raise ValueError("ul.course#_crclmDayTargetId 요소를 찾지 못했습니다.")

    results: List[LiveInfo] = []
    crawled_at = datetime.now(tz=KST)

    # 각 li = 하루
    for li in course_ul.select("> li"):
        date_span = li.select_one("> span.date")
        if not date_span:
            continue

        d = _parse_date_text(date_span.get_text(strip=True))

        # 각 dl = 하루 중 한 세션
        for dl in li.find_all("dl"):
            dt_tag = dl.find("dt")
            dd = dl.find("dd", class_="unit-box")
            if not dt_tag or not dd:
                continue

            time_text = dt_tag.get_text(strip=True)

            info_div = dd.select_one("div.info")
            if not info_div:
                continue

            # 제목
            subj_tag = info_div.select_one("span.subj")
            title = subj_tag.get_text(strip=True) if subj_tag else ""

            # 강의실 (Youtube Live 여부)
            class_room_tag = info_div.select_one("span.class-room")
            classroom = class_room_tag.get_text(strip=True) if class_room_tag else ""

            # Youtube Live가 아닌 경우 스킵
            if "youtube" not in classroom.lower():
                continue

            # 버튼 영역에서 liveDirect 버튼 찾기
            btn = dd.select_one("div.btns button.liveDirect")
            if not btn:
                continue

            data_req = (btn.get("data-req") or "").strip()
            btn_text = btn.get_text(strip=True)

            # 유튜브 링크가 아닌 경우(예: 다시보기 페이지 등) 스킵
            # (필요하면 '강의 다시보기'도 허용하도록 조건 완화 가능)
            if "youtu" not in data_req:
                continue

            start_dt, end_dt = _parse_time_range(time_text, d)

            info = LiveInfo(
                date=d,
                start_time=start_dt,
                end_time=end_dt,
                title=title,
                live_url=data_req,
                instructor=(info_div.select_one("span.name").get_text(strip=True)
                            if info_div.select_one("span.name") else None),
                classroom=classroom,
                crawled_at=crawled_at,
            )
            results.append(info)

    logger.info(f"[crawler] parsed {len(results)} youtube live sessions from curriculum page")
    return results


async def crawl_live_infos(
    url: Optional[str] = None,
    cookies: Optional[Dict[str, str]] = None,
) -> List[LiveInfo]:
    """
    외부에서 호출할 메인 함수.

    - HTML을 가져오고
    - Youtube Live 세션 목록을 파싱해서 반환한다.

    매일 07:00 KST에 이 함수를 호출해서,
    그 결과(List[LiveInfo])를 그대로 백엔드로 보내거나,
    오늘 날짜에 해당하는 것만 필터링해서 보낼 수 있다.
    """
    html = await fetch_curriculum_html(url=url, cookies=cookies)
    return parse_live_infos_from_html(html)
