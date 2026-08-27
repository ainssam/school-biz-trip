# 학교별 여비정산 템플릿

각 템플릿은 빈 HWP, 빈 PDF, HWP 필드맵, PDF 필드맵으로 구성합니다. 신청인 이름·연락처·계좌번호 등 개인정보가 입력된 파일은 이 폴더에 넣지 않습니다.

## 새 템플릿 추가

1. 학교별 하위 폴더를 만듭니다. 폴더명은 영문 소문자와 숫자, 하이픈을 권장합니다.
2. 개인정보를 제거한 빈 HWP와 PDF를 넣습니다.
3. HWP 표 셀 위치를 기록한 `hwp-field-map.json`을 만듭니다.
4. PDF 글자 좌표를 기록한 `pdf-field-map.json`을 만듭니다.
5. `registry.json`의 `templates` 배열에 학교 정보를 추가합니다.
6. 테스트와 빌드를 실행한 뒤 GitHub에 올립니다.

```text
templates/
├─ registry.json
└─ example-school-2026/
   ├─ form.hwp
   ├─ form.pdf
   ├─ hwp-field-map.json
   └─ pdf-field-map.json
```

등록 예시는 다음과 같습니다.

```json
{
  "id": "example-school-2026",
  "label": "예시고등학교 2026",
  "region": "충청남도",
  "school": "예시고등학교",
  "year": 2026,
  "description": "예시고등학교 여비정산 신청서",
  "files": {
    "hwp": "example-school-2026/form.hwp",
    "pdf": "example-school-2026/form.pdf",
    "hwpFieldMap": "example-school-2026/hwp-field-map.json",
    "pdfFieldMap": "example-school-2026/pdf-field-map.json"
  }
}
```

`defaultTemplateId`에는 앱을 처음 열었을 때 선택할 템플릿 ID를 적습니다. `id`는 중복될 수 없습니다.

## 필드맵

- HWP 필드맵은 원본 표의 section, paragraph, control, row, col 위치를 사용합니다.
- PDF 필드맵은 각 값의 x, y, width, fontSize, align 값을 사용합니다.
- 양식의 표·여백·고정 문구는 수정하지 않고 값이 들어갈 위치만 기록합니다.

현재 `bokja-2026` 항목이 실제 동작 예시입니다.
