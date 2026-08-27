# 여비정산 신청서 자동 생성 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 드롭다운과 날짜 선택 중심으로 출장 정보를 입력하면 원본 양식을 보존한 HWP와 PDF를 내려받을 수 있는 Vercel 웹앱을 만든다.

**Architecture:** Next.js App Router 웹앱을 `web/`에 두고, 공통 Zod 스키마로 브라우저와 API 입력을 검증한다. HWP는 개인정보를 제거한 한 페이지 템플릿을 임시 디렉터리에 복사한 뒤 셀 텍스트만 패치하며, PDF는 한컴오피스에서 만든 빈 기준 PDF 위에 같은 데이터를 좌표 기반으로 얹는다. 생성 파일은 응답 후 폐기하고 데이터베이스나 서버 로그에는 신청 내용을 남기지 않는다.

**Tech Stack:** Next.js App Router, TypeScript, React Hook Form, Zod, Tailwind CSS, Vitest, Testing Library, Playwright, pdf-lib, @pdf-lib/fontkit, claw-hwp raw-patch runtime, Vercel Node.js Functions

**Spec:** `docs/superpowers/specs/2026-08-27-travel-expense-generator-design.md`

## Global Constraints

- 원본 `★여비정산 신청서 작성요령.hwp`와 `여비정산 신청서(2026.5.30.)_하동원.hwp`는 수정·덮어쓰기·배포 자산 편입을 금지한다.
- 공개 저장소와 Vercel 배포물에는 기존 이름·출장지·목적·교직원 이름 등 원본의 개인정보를 포함하지 않는다.
- 한 번의 다운로드는 한 건의 출장, 한 페이지 신청서를 생성한다.
- HWP의 용지, 여백, 표, 셀 병합, 테두리, 글꼴, 글자 크기, 줄 간격은 빈 템플릿과 동일해야 한다.
- PDF는 한컴오피스에서 출력한 빈 기준 PDF를 배경으로 사용하며 표와 고정 문구를 코드로 다시 그리지 않는다.
- 긴 값은 서식을 자동 변형하지 않고 다운로드 전에 길이 오류로 차단한다.
- API 응답은 `Cache-Control: private, no-store, max-age=0`을 사용한다.
- 신청 내용, 생성 문서 본문과 완성 파일을 로그·분석·데이터베이스·영구 디스크에 저장하지 않는다.
- 최근 학교명·출발지·도착지만 해당 브라우저의 localStorage에 저장한다.
- Vercel 프로젝트 Root Directory는 `web`이다.

---

### Task 1: 저장소와 Next.js 검증 기반

**Files:**
- Create: `.gitignore`
- Create: `web/package.json`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/page.tsx`
- Create: `web/src/app/globals.css`
- Create: `web/vitest.config.ts`
- Create: `web/src/test/setup.ts`
- Create: `web/src/app/page.test.tsx`

**Interfaces:**
- Consumes: 승인된 설계 문서와 Global Constraints
- Produces: `npm test`, `npm run lint`, `npm run build`가 실행되는 Next.js 프로젝트

- [ ] **Step 1: 현재 폴더를 Git 저장소로 초기화하고 원본 문서를 추적에서 제외한다**

```powershell
git init
```

`.gitignore`에는 다음을 기록한다.

```gitignore
*.hwp
*.hwpx
*.pdf
!web/src/assets/templates/travel-expense-template.hwp
!web/src/assets/templates/travel-expense-template.pdf
web/.next/
web/node_modules/
web/test-results/
web/playwright-report/
web/coverage/
.env*
```

- [ ] **Step 2: Next.js 앱과 테스트 도구를 만든다**

```powershell
npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*"
Set-Location web
npm install react-hook-form zod @hookform/resolvers pdf-lib @pdf-lib/fontkit
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright @playwright/test
```

- [ ] **Step 3: 첫 화면 테스트를 작성한다**

```tsx
import { render, screen } from "@testing-library/react";
import Page from "./page";

it("신청서 작성과 작성요령 메뉴를 보여준다", () => {
  render(<Page />);
  expect(screen.getByRole("tab", { name: "신청서 작성" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "작성요령" })).toBeInTheDocument();
});
```

- [ ] **Step 4: 테스트가 실패하는지 확인한다**

Run: `cd web; npm test -- --run src/app/page.test.tsx`

Expected: `신청서 작성` 탭을 찾지 못해 FAIL

- [ ] **Step 5: 접근 가능한 두 탭이 있는 최소 화면을 구현한다**

`page.tsx`는 클라이언트 컴포넌트 `TravelExpenseApp`을 렌더하고, `TravelExpenseApp`은 `role="tablist"`, `role="tab"`, `aria-selected`를 사용한다.

- [ ] **Step 6: 기반 검증을 실행한다**

Run: `cd web; npm test -- --run; npm run lint; npm run build`

Expected: 모두 exit code 0

- [ ] **Step 7: 커밋한다**

```powershell
git add .gitignore web docs
git commit -m "chore: scaffold travel expense web app"
```

---

### Task 2: 출장 신청 도메인 모델과 계산 규칙

**Files:**
- Create: `web/src/lib/travel-expense/schema.ts`
- Create: `web/src/lib/travel-expense/transform.ts`
- Test: `web/src/lib/travel-expense/transform.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `TravelExpenseInput`, `TravelType`, `RouteInput`, `travelExpenseSchema`, `makeReturnRoute(route)`, `sumFare(routes)`, `makeDownloadFilename(input, ext)`

- [ ] **Step 1: 실패하는 도메인 테스트를 작성한다**

```ts
import { describe, expect, it } from "vitest";
import { makeDownloadFilename, makeReturnRoute, sumFare } from "./transform";

describe("출장 자료 변환", () => {
  it("가는 경로를 뒤집어 돌아오는 경로를 만든다", () => {
    expect(makeReturnRoute({ date: "2026-08-27", transport: "철도", from: "천안", to: "서울", grade: "제2호", fare: 12000 }))
      .toEqual({ date: "2026-08-27", transport: "철도", from: "서울", to: "천안", grade: "제2호", fare: 12000 });
  });

  it("숫자 운임만 합산한다", () => {
    expect(sumFare([{ fare: 3500 }, { fare: "미기재" }, { fare: 3500 }])).toBe(7000);
  });

  it("Windows 금지문자를 제거한 파일명을 만든다", () => {
    expect(makeDownloadFilename({ name: "홍:길동", tripStart: "2026-08-27" }, "hwp"))
      .toBe("여비정산신청서_홍길동_2026-08-27.hwp");
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web; npm test -- --run src/lib/travel-expense/transform.test.ts`

Expected: 모듈을 찾지 못해 FAIL

- [ ] **Step 3: Zod 스키마와 순수 변환 함수를 구현한다**

`TravelExpenseInput`에는 `school`, `position`, `name`, `tripStart`, `tripEnd`, `applicationDate`, `destination`, `purpose`, `travelType`, `routes`, `lodging`, `meals`, `attachments`, `attachmentOther`를 둔다. `routes`는 최대 4개이고 문자열은 `trim()` 후 길이를 제한한다. `purpose`는 60자, `destination`은 36자, `school`은 20자, `name`은 10자를 넘으면 Zod 오류를 반환한다.

- [ ] **Step 4: 테스트와 타입 검사를 통과시킨다**

Run: `cd web; npm test -- --run src/lib/travel-expense/transform.test.ts; npm run build`

Expected: PASS, build exit code 0

- [ ] **Step 5: 커밋한다**

```powershell
git add web/src/lib
git commit -m "feat: define travel expense input rules"
```

---

### Task 3: 개인정보 없는 한 페이지 HWP·PDF 기준 템플릿

**Files:**
- Create: `tools/template/README.md`
- Create: `tools/template/template-field-map.json`
- Create: `web/src/assets/templates/travel-expense-template.hwp`
- Create: `web/src/assets/templates/travel-expense-template.pdf`
- Create: `web/src/assets/templates/template-field-map.json`
- Create: `web/src/assets/templates/pdf-field-map.ts`
- Test: `web/src/assets/templates/template-assets.test.ts`

**Interfaces:**
- Consumes: 루트의 두 원본 HWP, 설치된 한컴오피스 2024, claw-hwp의 `extract_text.js`와 `create.js`
- Produces: 개인정보가 없고 한 페이지만 가진 HWP 템플릿, 한컴오피스가 출력한 같은 페이지의 PDF, HWP 셀 좌표와 PDF 텍스트 좌표 맵

- [ ] **Step 1: 원본을 직접 추적하거나 수정하지 않는 준비 절차를 문서화한다**

`tools/template/README.md`에 다음 원칙을 기록한다.

```md
1. 원본 HWP는 읽기 전용으로 사용한다.
2. 작업 복사본에서 두 번째 신청서 페이지를 제거한다.
3. 모든 기존 값과 서명자명을 빈 문자열로 바꾼다.
4. 실제 한컴오피스에서 열고 `travel-expense-template.hwp`로 저장한다.
5. 같은 파일을 한컴오피스의 PDF 저장으로 `travel-expense-template.pdf`로 만든다.
6. 템플릿을 텍스트 추출해 기존 이름·출장지·목적·날짜가 남지 않았는지 로컬에서 검사한다.
```

- [ ] **Step 2: 빈 템플릿 자산 테스트를 먼저 작성한다**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("HWP와 PDF 기준 템플릿이 배포 자산에 존재한다", () => {
  expect(readFileSync(join(process.cwd(), "src/assets/templates/travel-expense-template.hwp")).subarray(0, 8).toString("hex"))
    .toBe("d0cf11e0a1b11ae1");
  expect(readFileSync(join(process.cwd(), "src/assets/templates/travel-expense-template.pdf")).subarray(0, 4).toString())
    .toBe("%PDF");
});
```

- [ ] **Step 3: HWP 복사본을 한 페이지로 만들고 모든 값 칸을 비운다**

한컴오피스 2024에서 작업 복사본을 열어 두 번째 신청서 페이지 전체를 삭제한다. 첫 페이지에서 소속, 직급, 성명, 출장 일정, 출장지, 출장목적, 숙박비, 식비, 운임 4행, 계, 첨부, 작성일, 신청인 성명을 비운다. 표·문단·글꼴 속성은 변경하지 않는다. 결과를 `web/src/assets/templates/travel-expense-template.hwp`로 별도 저장한다.

- [ ] **Step 4: HWP 필드 위치를 좌표로 고정한다**

`template-field-map.json`은 다음 형식을 사용한다.

```json
{
  "school": { "section": 0, "para": 0, "control": 0, "row": 0, "col": 1 },
  "position": { "section": 0, "para": 0, "control": 0, "row": 0, "col": 3 },
  "name": { "section": 0, "para": 0, "control": 0, "row": 0, "col": 5 },
  "routes": [
    { "row": 7, "dateCol": 0, "transportCol": 1, "fromCol": 2, "toCol": 3, "gradeCol": 4, "fareCol": 5 },
    { "row": 8, "dateCol": 0, "transportCol": 1, "fromCol": 2, "toCol": 3, "gradeCol": 4, "fareCol": 5 },
    { "row": 9, "dateCol": 0, "transportCol": 1, "fromCol": 2, "toCol": 3, "gradeCol": 4, "fareCol": 5 },
    { "row": 10, "dateCol": 0, "transportCol": 1, "fromCol": 2, "toCol": 3, "gradeCol": 4, "fareCol": 5 }
  ]
}
```

실제 `para`, `control`, 병합 셀 좌표는 빈 템플릿의 `extract_text.js --inspect` 결과로 확인해 위 맵을 교정한다. 좌표 검사는 기존 값을 읽어 출력하지 않고 빈 템플릿에서만 수행한다.

- [ ] **Step 5: 한컴오피스에서 빈 HWP를 PDF로 저장한다**

용지 크기, 배율, 여백을 바꾸지 않고 `web/src/assets/templates/travel-expense-template.pdf`로 저장한다. LibreOffice 변환본은 기준 PDF로 사용하지 않는다.

- [ ] **Step 6: PDF 값 좌표를 고정한다**

`pdf-field-map.ts`는 PDF point 단위의 `x`, `y`, `width`, `fontSize`, `align`을 가진다.

```ts
export type PdfField = { x: number; y: number; width: number; fontSize: number; align: "left" | "center" | "right" };
export const pdfFieldMap: Record<string, PdfField> = loadMeasuredPdfFieldMap();
```

`loadMeasuredPdfFieldMap()`은 기준 PDF를 300dpi로 렌더해 확인한 셀 내부 기준점과 폭을 point 단위 JSON으로 읽는다. 측정 결과는 신청자 정보, 일정, 출장지, 목적, 비용, 운임 4행, 합계, 첨부, 작성일과 신청인 성명 모든 필드에 기록한다. 생성 PDF와 기준 PDF를 겹쳐 값 기준선이 일치할 때만 좌표 맵을 완료 처리하며 임의 추정값을 완료값으로 간주하지 않는다.

- [ ] **Step 7: 자산 검사와 실제 한컴 열기를 수행한다**

Run: `cd web; npm test -- --run src/assets/templates/template-assets.test.ts`

Expected: PASS. 이어서 템플릿 HWP를 한컴오피스 2024에서 열어 한 페이지, 원본과 동일한 고정 서식, 빈 값 칸을 확인한다.

- [ ] **Step 8: 커밋한다**

```powershell
git add tools/template web/src/assets/templates
git commit -m "feat: add sanitized travel expense templates"
```

---

### Task 4: HWP 생성 엔진과 API

**Files:**
- Create: `web/vendor/claw-hwp/cell-patch.js`
- Create: `web/vendor/claw-hwp/vendor/rhwp/rhwp.js`
- Create: `web/vendor/claw-hwp/vendor/rhwp/rhwp_bg.wasm`
- Create: `web/vendor/claw-hwp/vendor/cfb/cfb.js`
- Create: `web/vendor/claw-hwp/vendor/cfb/package.json`
- Create: `web/vendor/claw-hwp/LICENSE`
- Create: `web/src/lib/hwp/generate-hwp.ts`
- Create: `web/src/lib/hwp/generate-hwp.test.ts`
- Create: `web/src/app/api/generate/hwp/route.ts`
- Modify: `web/next.config.ts`

**Interfaces:**
- Consumes: `TravelExpenseInput`, HWP 템플릿, `template-field-map.json`
- Produces: `generateHwp(input: TravelExpenseInput): Promise<Uint8Array>`와 `POST /api/generate/hwp`

- [ ] **Step 1: 생성 테스트를 작성한다**

```ts
it("원본 템플릿을 바꾸지 않고 HWP를 생성한다", async () => {
  const before = readFileSync(templatePath);
  const output = await generateHwp(validInput);
  expect(Buffer.from(output).subarray(0, 8).toString("hex")).toBe("d0cf11e0a1b11ae1");
  expect(readFileSync(templatePath)).toEqual(before);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web; npm test -- --run src/lib/hwp/generate-hwp.test.ts`

Expected: `generateHwp`가 없어 FAIL

- [ ] **Step 3: MIT 라이선스와 필요한 raw-patch 런타임만 프로젝트에 복사한다**

`cell-patch.js`, rhwp WASM, CFB 런타임과 해당 라이선스를 `web/vendor/claw-hwp/`에 둔다. create.js 전체 CLI에 의존하지 않고 `patchCellsInPlace`를 직접 import한다. Next.js 파일 추적에는 템플릿, WASM과 CFB 런타임을 포함한다.

- [ ] **Step 4: 임시파일 기반 HWP 생성을 구현한다**

```ts
export async function generateHwp(input: TravelExpenseInput): Promise<Uint8Array> {
  const parsed = travelExpenseSchema.parse(input);
  const tempDir = await mkdtemp(join(tmpdir(), "travel-expense-"));
  const outputPath = join(tempDir, "result.hwp");
  try {
    await copyFile(templatePath, outputPath);
    await patchCellsInPlace(outputPath, buildCellEdits(parsed, fieldMap));
    return new Uint8Array(await readFile(outputPath));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
```

`buildCellEdits`는 모든 셀 수정을 하나의 배열로 만들며 값 자체를 로그로 출력하지 않는다.

- [ ] **Step 5: no-store 다운로드 API를 구현한다**

```ts
export const runtime = "nodejs";
export async function POST(request: Request) {
  const input = travelExpenseSchema.parse(await request.json());
  const bytes = await generateHwp(input);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/x-hwp",
      "Content-Disposition": contentDisposition(makeDownloadFilename(input, "hwp")),
      "Cache-Control": "private, no-store, max-age=0"
    }
  });
}
```

- [ ] **Step 6: 생성·원본보존·헤더 테스트를 통과시킨다**

Run: `cd web; npm test -- --run src/lib/hwp/generate-hwp.test.ts; npm run build`

Expected: PASS, build exit code 0

- [ ] **Step 7: 커밋한다**

```powershell
git add web/vendor web/src/lib/hwp web/src/app/api web/next.config.ts
git commit -m "feat: generate HWP from preserved template"
```

---

### Task 5: 원본 배경 기반 PDF 생성 엔진과 API

**Files:**
- Create: `web/src/assets/fonts/NotoSansKR-Regular.ttf`
- Create: `web/src/lib/pdf/generate-pdf.ts`
- Create: `web/src/lib/pdf/generate-pdf.test.ts`
- Create: `web/src/app/api/generate/pdf/route.ts`

**Interfaces:**
- Consumes: `TravelExpenseInput`, `travel-expense-template.pdf`, `pdfFieldMap`
- Produces: `generatePdf(input: TravelExpenseInput): Promise<Uint8Array>`와 `POST /api/generate/pdf`

- [ ] **Step 1: PDF 생성 테스트를 작성한다**

```ts
it("한 페이지 PDF를 생성하고 기준 페이지 크기를 유지한다", async () => {
  const output = await generatePdf(validInput);
  const pdf = await PDFDocument.load(output);
  expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getPage(0).getSize()).toEqual(referenceSize);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web; npm test -- --run src/lib/pdf/generate-pdf.test.ts`

Expected: `generatePdf`가 없어 FAIL

- [ ] **Step 3: 기준 PDF 위에 값만 쓰는 함수를 구현한다**

```ts
export async function generatePdf(input: TravelExpenseInput): Promise<Uint8Array> {
  const parsed = travelExpenseSchema.parse(input);
  const pdf = await PDFDocument.load(await readFile(pdfTemplatePath));
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile(fontPath), { subset: true });
  const page = pdf.getPage(0);
  for (const item of buildPdfTextItems(parsed, pdfFieldMap)) {
    drawTextInField(page, font, item);
  }
  return pdf.save({ useObjectStreams: false });
}
```

`drawTextInField`는 글자 폭이 필드 폭을 넘으면 예외를 던지고 글꼴 크기나 배경을 바꾸지 않는다.

- [ ] **Step 4: HWP API와 동일한 검증·파일명·no-store 헤더로 PDF API를 구현한다**

- [ ] **Step 5: PDF 테스트와 빌드를 통과시킨다**

Run: `cd web; npm test -- --run src/lib/pdf/generate-pdf.test.ts; npm run build`

Expected: PASS, build exit code 0

- [ ] **Step 6: 커밋한다**

```powershell
git add web/src/assets/fonts web/src/lib/pdf web/src/app/api/generate/pdf
git commit -m "feat: generate PDF over original background"
```

---

### Task 6: 드롭다운 중심 신청서 화면과 작성요령

**Files:**
- Create: `web/src/components/travel-expense/TravelExpenseApp.tsx`
- Create: `web/src/components/travel-expense/ExpenseForm.tsx`
- Create: `web/src/components/travel-expense/RouteEditor.tsx`
- Create: `web/src/components/travel-expense/GuideView.tsx`
- Create: `web/src/components/travel-expense/DownloadActions.tsx`
- Create: `web/src/hooks/useRecentSuggestions.ts`
- Create: `web/src/components/travel-expense/ExpenseForm.test.tsx`
- Modify: `web/src/app/page.tsx`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Consumes: `TravelExpenseInput`, 변환 함수, HWP·PDF API
- Produces: PC·모바일에서 사용할 수 있는 두 메뉴와 완성된 입력·다운로드 흐름

- [ ] **Step 1: 사용자 흐름 테스트를 작성한다**

```tsx
it("출장유형을 자가용으로 고르면 운임을 미기재로 바꾼다", async () => {
  const user = userEvent.setup();
  render(<ExpenseForm />);
  await user.selectOptions(screen.getByLabelText("출장유형"), "car");
  expect(screen.getByLabelText("교통편 1")).toHaveValue("자가용");
  expect(screen.getByLabelText("금액 1")).toHaveValue("미기재");
});

it("돌아오는 경로를 반대로 추가한다", async () => {
  const user = userEvent.setup();
  render(<ExpenseForm />);
  await user.type(screen.getByLabelText("출발지 1"), "천안");
  await user.type(screen.getByLabelText("도착지 1"), "서울");
  await user.click(screen.getByRole("button", { name: "돌아오는 경로 자동 추가" }));
  expect(screen.getByLabelText("출발지 2")).toHaveValue("서울");
  expect(screen.getByLabelText("도착지 2")).toHaveValue("천안");
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `cd web; npm test -- --run src/components/travel-expense/ExpenseForm.test.tsx`

Expected: 컴포넌트를 찾지 못해 FAIL

- [ ] **Step 3: 디자인 토큰과 반응형 레이아웃을 구현한다**

따뜻한 종이색 배경, 진한 남색 헤더, 얇은 회색 테두리와 명확한 포커스 링을 사용한다. 모바일에서는 한 열, 768px 이상에서는 신청자·출장·운임 영역을 두 열 또는 표 형태로 배치한다. 기본 브라우저 스타일에만 의존하지 않고 탭, 카드, 버튼, 오류 상태를 일관되게 만든다.

- [ ] **Step 4: 드롭다운·날짜 선택·체크박스 중심 폼을 구현한다**

소속은 `복자여자고등학교`와 최근 학교 목록, `다른 학교 입력`으로 구성한다. 직급, 출장유형, 교통편, 등급은 드롭다운으로 만들고 날짜는 `input type="date"`, 첨부는 체크박스로 만든다. 직접 입력은 성명, 새로운 학교, 출장지, 목적, 출발지·도착지, 기타 첨부만 허용한다.

- [ ] **Step 5: 작성요령 카드 화면을 구현한다**

원본의 제출기한, 제출 순서, 일비·식비, 당일·숙박, 자가용, 대중교통, 차량동승, 전세버스, 숙박비, 영수증 기준을 의미와 금액을 바꾸지 않고 카드로 보여준다. 원본 파일에 있던 교직원 실명과 내부 담당자 실명은 공개 화면과 다운로드 자산에 넣지 않는다.

- [ ] **Step 6: 최근 후보를 브라우저에만 저장한다**

```ts
const STORAGE_KEY = "travel-expense-recent-v1";
type RecentSuggestions = { schools: string[]; places: string[] };
```

학교명과 출발·도착지만 최대 8개씩 저장하고, `최근 입력 지우기` 버튼을 제공한다. 성명, 목적, 날짜, 금액은 저장하지 않는다.

- [ ] **Step 7: HWP·PDF 다운로드와 오류 유지를 구현한다**

두 버튼은 같은 검증 완료 데이터를 각 API로 POST한다. 오류 시 폼 값을 초기화하지 않고 해당 메시지를 알림 영역에 표시한다. 성공 시 Blob URL을 만들어 다운로드한 뒤 즉시 `URL.revokeObjectURL`한다.

- [ ] **Step 8: UI 테스트와 빌드를 통과시킨다**

Run: `cd web; npm test -- --run src/components/travel-expense/ExpenseForm.test.tsx; npm run lint; npm run build`

Expected: 모두 exit code 0

- [ ] **Step 9: 커밋한다**

```powershell
git add web/src/components web/src/hooks web/src/app
git commit -m "feat: add dropdown-first travel expense workflow"
```

---

### Task 7: 통합·보안·브라우저 회귀 검증

**Files:**
- Create: `web/e2e/travel-expense.spec.ts`
- Create: `web/playwright.config.ts`
- Create: `web/src/app/api/generate/routes.test.ts`
- Modify: `web/package.json`

**Interfaces:**
- Consumes: 완성된 UI와 두 생성 API
- Produces: 실제 브라우저에서 네 가지 유형과 다운로드를 검증한 증거

- [ ] **Step 1: API 통합 테스트를 작성한다**

```ts
it.each(["car", "public", "ride", "charter"])("%s 유형에서 두 파일을 생성한다", async (travelType) => {
  const input = makeValidInput({ travelType });
  const hwp = await postHwp(input);
  const pdf = await postPdf(input);
  expect(hwp.headers.get("cache-control")).toContain("no-store");
  expect(pdf.headers.get("cache-control")).toContain("no-store");
  expect((await hwp.arrayBuffer()).byteLength).toBeGreaterThan(10000);
  expect((await pdf.arrayBuffer()).byteLength).toBeGreaterThan(10000);
});
```

- [ ] **Step 2: Playwright 사용자 흐름을 작성한다**

```ts
test("모바일에서 작성요령을 보고 왕복 신청서를 내려받는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("tab", { name: "작성요령" }).click();
  await expect(page.getByText("출장 후 7일 이내")).toBeVisible();
  await page.getByRole("tab", { name: "신청서 작성" }).click();
  await fillValidForm(page);
  await page.getByRole("button", { name: "돌아오는 경로 자동 추가" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF 내려받기" }).click();
  await expect((await download).suggestedFilename()).toMatch(/여비정산신청서_.+\.pdf/);
});
```

- [ ] **Step 3: 개인정보 로그 금지 검사를 추가한다**

테스트 입력의 이름과 출장목적을 고유 문자열로 설정하고, API 호출 중 가로챈 `console.log`, `console.error` 인자와 오류 응답 본문에 해당 문자열이 없는지 확인한다.

- [ ] **Step 4: 전체 자동 검증을 실행한다**

Run: `cd web; npm test -- --run; npm run lint; npm run build; npx playwright test`

Expected: 모두 exit code 0

- [ ] **Step 5: 커밋한다**

```powershell
git add web/e2e web/playwright.config.ts web/src/app/api web/package.json
git commit -m "test: cover document generation workflow"
```

---

### Task 8: 실제 한컴·PDF 겹침 확인과 Vercel 배포

**Files:**
- Create: `artifacts/qa/README.md`
- Create: `web/vercel.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: 로컬 완성본, 한컴오피스 2024, Vercel CLI
- Produces: 실제 HWP 열기, PDF 시각 비교, 모바일·데스크톱 배포 확인이 끝난 운영 URL

- [ ] **Step 1: 합성 자료로 네 유형의 HWP와 PDF를 만든다**

실제 교직원 정보 대신 `테스트교사`, `가온고등학교`, `교육과정 연수 참석` 같은 합성값을 사용한다. 자가용, 대중교통, 차량동승, 전세버스별 HWP와 PDF를 `artifacts/qa/`에 만든다.

- [ ] **Step 2: 실제 한컴오피스에서 HWP를 연다**

각 HWP를 한컴오피스 2024에서 열어 페이지 수 1, 원본과 같은 용지·여백·표·셀 병합·테두리·글꼴·글자 크기·줄 간격, 올바른 값 배치를 확인한다. 미리보기 통과만으로 한글 호환성 검증을 완료 처리하지 않는다.

- [ ] **Step 3: HWP와 PDF 고정 서식을 겹쳐 비교한다**

생성 HWP를 한컴오피스에서 PDF로 출력하고 기준 PDF와 이미지 차분한다. 텍스트 값 영역을 제외한 고정 서식 픽셀 차이가 없어야 한다. 생성 PDF도 기준 배경과 겹쳐 표선과 여백 차이가 없는지 확인한다.

- [ ] **Step 4: 배포 전 전체 검증을 다시 실행한다**

Run: `cd web; npm test -- --run; npm run lint; npm run build; npx playwright test`

Expected: 모두 exit code 0

- [ ] **Step 5: Vercel 프로젝트를 `web` 루트로 배포한다**

`deploy-to-vercel` 또는 `vercel-cli-with-tokens` 지침을 사용한다. Preview 배포에서 HWP·PDF 다운로드를 확인한 뒤 Production으로 승격한다. 원본 HWP 두 파일과 `artifacts/qa/`는 배포 번들에 포함하지 않는다.

- [ ] **Step 6: 운영 URL에서 실제 브라우저 스모크 테스트를 수행한다**

데스크톱과 390px 모바일 뷰에서 두 메뉴, 드롭다운, 왕복 자동 추가, HWP·PDF 다운로드, no-store 응답을 확인한다. Vercel 로그에 신청 내용이 남지 않는지 확인한다.

- [ ] **Step 7: 운영 증거와 남은 수동 확인을 기록한다**

`artifacts/qa/README.md`에는 실행 명령, 통과 개수, 실제 한컴오피스 열기 결과, PDF 겹침 결과, 배포 URL, 사용자 로그인 필요 여부를 기록한다. 개인 데이터가 있는 화면 캡처와 문서 내용은 기록하지 않는다.

- [ ] **Step 8: 최종 커밋한다**

```powershell
git add README.md web/vercel.json artifacts/qa/README.md
git commit -m "docs: record travel expense release evidence"
```
