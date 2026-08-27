# 여비정산신청서 제작 도구

기존 여비정산 신청서의 표·여백·고정 문구를 보존하면서 입력값만 채운 HWP와 PDF를 만드는 Next.js 웹앱입니다.

- 운영 주소: <https://school-biz-trip.vercel.app>
- 학교·지역·연도별 템플릿 선택
- HWP·PDF 원본 양식과 필드맵을 한 묶음으로 관리
- 개인정보를 저장하지 않고 생성 결과만 내려받기

## 학교별 템플릿

템플릿 목록은 `web/src/assets/templates/registry.json`에서 관리합니다. 새 학교 양식을 추가할 때는 개인정보가 없는 빈 파일과 필드맵을 `web/src/assets/templates` 아래에 넣고 `registry.json`에 항목을 추가합니다.

```text
web/src/assets/templates/
├─ registry.json
├─ travel-expense-template.hwp
├─ travel-expense-template.pdf
├─ template-field-map.json
└─ pdf-field-map.json
```

상세한 추가 방법은 [`web/src/assets/templates/README.md`](web/src/assets/templates/README.md)를 참고합니다.

## 실행

```powershell
Set-Location web
npm install
npm run dev -- --hostname 127.0.0.1 --port 3737
```

브라우저에서 `http://127.0.0.1:3737`을 엽니다.

## 검증

```powershell
Set-Location web
npm test -- --run
npm run lint
npm run build
npm run test:e2e
```

## 개인정보와 원본 보존

- 회원가입, 데이터베이스, 서버 보관 기능이 없습니다.
- 최근 학교명과 장소만 사용자의 브라우저에 저장합니다.
- API 응답은 `private, no-store`로 반환합니다.
- 루트의 원본 HWP 두 파일은 읽기 전용 기준 자료이며 배포·Git 추적 대상이 아닙니다.
- Git에는 개인정보 없는 빈 배포용 템플릿만 포함합니다.
- 배포 루트는 `web`입니다.
