# 여비정산신청서 제작 도구

학교·지역·연도별 원본 양식을 선택해 HWP와 PDF 여비정산 신청서를 만드는 Next.js 앱입니다.

## 출장 신청서 가져오기

- `.xlsx`와 텍스트형 `.pdf`를 여러 개 한꺼번에 올릴 수 있습니다.
- 엑셀은 표의 여러 행, 시트별 신청서, 한 시트 안의 반복 양식을 모두 후보로 인식합니다.
- PDF는 한 쪽을 한 건으로 인식합니다. 스캔 이미지 PDF는 OCR하지 않으므로 직접 입력해야 합니다.
- 이름, 직위, 출장 기간, 출장지, 목적 등 확인된 값만 폼에 채우고 원본에 없는 값은 빈칸으로 둡니다.
- 인식 결과는 최대 40건까지 각각 수정할 수 있으며, HWP 또는 PDF 한 파일에 건별 한 쪽씩 묶어 내려받습니다.
- 원본 파일 분석은 브라우저 안에서 처리하며, 문서 생성 요청에는 사용자가 확인한 정규화 값만 전달합니다.

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
