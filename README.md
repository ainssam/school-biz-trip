# 여비정산 신청서 만들기

기존 여비정산 신청서의 표·여백·고정 문구를 보존하면서 입력값만 채운 HWP와 PDF를 만드는 Next.js 웹앱입니다.

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
- 배포 루트는 `web`입니다.
