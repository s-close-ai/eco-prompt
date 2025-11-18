package com.closeai.ecoprompt.mr.service;

public class MrPromptBuilder {

    public static String buildMrPrompt(String title, String description, String diffText, String mrTemplate) {
        return """
                너는 GitLab Merge Request 설명을 작성하는 도우미야.

                아래는 MR의 메타 정보와 코드 변경(diff)이다.

                [MR 제목]
                %s

                [기존 MR 설명]
                %s

                [코드 diff]
                %s

                위 정보를 기반으로 아래 "MR 템플릿" 형식에 맞춰 **완성된 Markdown**을 작성해줘.

                요구사항:
                - 템플릿의 섹션 제목과 구조(##, ###, 리스트, <br/>)는 그대로 유지해.
                - 해당되는 Part에만 `- [x]` 로 체크하고, 나머지는 `- [ ]` 로 남겨둬.
                - "작업 내용"에는 구현/변경된 내용을 기능 단위로 bullet로 정리해줘.
                - 이미지 첨부, 지라 링크, Closes 부분은 있으면 채우고, 없으면 예시 또는 TODO 형식으로 자연스럽게 작성해.
                - 출력에는 아래 템플릿의 내용만 포함하고, 설명 문장이나 메타 텍스트는 추가하지 마.

                [MR 템플릿 시작]
                %s
                [MR 템플릿 끝]
                """.formatted(title, description, diffText, mrTemplate);
    }
}
