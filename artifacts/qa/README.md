# 여비정산 생성기 QA 기록

검증일: 2026-08-28

## 자동 검증

- Vitest: 12개 파일, 34개 테스트 통과
- ESLint: 오류·경고 없음
- Next.js 프로덕션 빌드: 통과
- Playwright: 로컬 데스크톱·모바일 HWP/PDF 다운로드 10개 시나리오 통과
- agent-browser: 본문 있음, Next.js 오류 오버레이 없음, 핵심 입력·다운로드 요소 확인

## 문서 생성

- 합성 자료만 사용: `가온고등학교`, `테스트교사`, `교육과정 담당자 연수 참석`
- 자가용·대중교통·차량동승·전세버스 각 HWP/PDF 생성 성공
- HWP 4개는 실제 한컴오피스 2024 COM 자동화로 열기 성공
- HWP 4개 모두 1페이지 확인 후 한컴오피스에서 PDF 재저장 성공
- 한컴 재저장 PDF와 웹 생성 PDF를 각각 이미지로 렌더링해 표·여백·고정 문구·값 배치를 육안 확인
- 첫 일괄 COM 실행에서 한 번 열기 실패가 있었으나 같은 파일의 단독 재검증 및 전체 반복 검증에서 4/4 성공

## 보존·배포 경계

- 원본 HWP 두 파일은 수정하지 않았습니다.
- `samples/`, `hancom-pdf/`, `renders/`는 합성 QA 산출물이며 Vercel 배포 루트 밖에 있습니다.
- 원본 작성요령에 포함된 교직원 실명은 공개 화면과 배포 자산에서 제외했습니다.

## Vercel 배포 상태

- Vercel CLI 54.15.1 설치 확인
- 원인 1: 이전 운영 화면이 템플릿 적용 전 배포본이라 HWP 요청에 `templateId`가 없었음
- 원인 2: Vercel의 `/var/task`에서 vendored `rhwp.js`를 ES 모듈로 해석할 `package.json`이 없어 HWP 함수가 실패함
- 원인 3: 원격 응답 뒤 Blob URL을 클릭 직후 해제해 브라우저 다운로드 이벤트가 시작되기 전에 사라질 수 있었음
- 수정 커밋: `6cb4871`(rhwp ES 모듈 표기), `5d8a5dd`(Blob URL 유지·정리 지연)
- 운영 배포: `dpl_95mLT6QVHTvJUHwM69iZbrdfR4eF`, 상태 `Ready`
- 운영 URL: <https://school-biz-trip.vercel.app>
- 운영 HWP API: HTTP 200, `application/x-hwp`, `private, no-store`, 39,424 bytes, HWP 매직 바이트 확인
- 운영 브라우저: 데스크톱·390px 모바일에서 `여비정산신청서_테스트교사_2026-08-28.hwp` 다운로드 성공, 실패 없음
- 운영 런타임 로그: 최신 HWP 요청 HTTP 200, ES 모듈 경고 없음
