# 여비정산신청서 제작 도구

학교·지역·연도별 원본 양식을 선택해 HWP와 PDF 여비정산 신청서를 만드는 Next.js 앱입니다.

## 로컬 실행

```powershell
npm install
npm run dev -- --hostname 127.0.0.1 --port 3737
```

## 템플릿 추가

템플릿 레지스트리와 필드맵은 [`src/assets/templates/README.md`](src/assets/templates/README.md)에 설명되어 있습니다.

## HWP 엔진

서버의 HWP 생성 경로는 [`claw-hwp`](https://github.com/DoHyun468/claw-hwp)의 `cell-patch` 런타임을 프로젝트 내부에서 직접 사용합니다. MCP 서버에 접속하는 방식은 아니며, 관련 고지는 [`vendor/claw-hwp/NOTICE.md`](vendor/claw-hwp/NOTICE.md)에 있습니다.

## 확인

```powershell
npm test -- --run
npm run lint
npm run build
npm run test:e2e
```
