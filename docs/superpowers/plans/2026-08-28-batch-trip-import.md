# Batch Trip Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** XLSX·PDF 여러 파일에서 출장 건을 시트·행·양식 블록·PDF 페이지별로 인식하고, 확인된 값만 편집 가능한 초안에 연결한 뒤 한 HWP와 한 PDF에 건별 한 페이지로 생성한다.

**Architecture:** 원본 파일은 클라이언트 전용 어댑터에서 `TripImportCandidate[]`로 정규화하며 서버에 업로드하지 않는다. 화면은 후보를 `TravelExpenseDraftInput[]`로 보관하고 선택한 초안만 기존 폼으로 편집한다. 생성 API는 검증된 `TravelExpenseInput[]`를 받아 PDF 페이지 또는 HWP 섹션을 입력 순서대로 만든다.

**Tech Stack:** Next.js 16.3.3, React 19.2.8, TypeScript, React Hook Form, Zod 4, Vitest, Testing Library, Playwright, ExcelJS 4.4.0, Mozilla PDF.js `pdfjs-dist` 6.2.108, pdf-lib 1.17.1, vendored claw-hwp CFB patcher

**Spec:** `docs/superpowers/specs/2026-08-28-batch-trip-import-design.md`

## Global Constraints

- 지원 입력은 `.xlsx`와 텍스트 기반 `.pdf`뿐이며 스캔 PDF OCR은 하지 않는다.
- XLSX 원본은 파일, 표시 시트, 행, 반복 양식 블록 순서로 탐색한다.
- 원본에서 확인하지 못한 값은 빈칸으로 유지하고 출장지→도착지 같은 추정을 하지 않는다.
- 같은 내용의 두 출장 건을 자동 중복 삭제하지 않는다.
- 원본 파일 전체는 브라우저에서만 읽고 생성 API에는 사용자가 검토한 정규화 값만 전송한다.
- 실제 제공 파일과 개인정보 값은 테스트, 스냅샷, 로그, 문서, 커밋에 넣지 않는다.
- 한 문서의 최대 출장 건수는 40건이다.
- HWP는 CFB 구조 검사와 실제 한컴오피스/한컴독스 열기 확인 전까지 완료 또는 배포로 표시하지 않는다.
- 운영 배포는 별도 승인 없이는 하지 않는다.

## File Structure

- `web/src/lib/import/types.ts`: 인식 후보, 출처, 필드, 상태 타입
- `web/src/lib/import/normalize.ts`: 문자열·날짜·라벨 정규화
- `web/src/lib/import/xlsx.ts`: ExcelJS 워크북을 표/신청서 구조로 인식
- `web/src/lib/import/pdf.ts`: PDF.js 위치 텍스트를 페이지별 신청서로 인식
- `web/src/lib/import/read-files.client.ts`: 확장자별 브라우저 파일 어댑터
- `web/src/lib/travel-expense/draft.ts`: 부분 인식 결과와 편집 폼 사이의 빈 초안 변환
- `web/src/hooks/useTripDraftQueue.ts`: 여러 초안 선택·수정·제외 상태
- `web/src/components/travel-expense/ImportPanel.tsx`: 다중 파일 선택과 분석 상태
- `web/src/components/travel-expense/ImportCandidateList.tsx`: 후보 목록과 출처·누락 표시
- `web/src/components/travel-expense/ExpenseForm.tsx`: 선택 초안 편집과 일괄 다운로드 통합
- `web/src/lib/travel-expense/batch-schema.ts`: 단건/배열 요청 정규화와 40건 제한
- `web/src/lib/pdf/generate-pdf.ts`: 단건·다중 페이지 PDF 생성
- `web/vendor/claw-hwp/cell-patch.mjs`: 템플릿 섹션 복제와 DocInfo 섹션 수 갱신
- `web/src/lib/hwp/generate-hwp.ts`: 단건·다중 섹션 HWP 생성
- `web/src/app/api/generate/{hwp,pdf}/route.ts`: 단건/일괄 요청 및 파일명 응답
- `web/e2e/batch-import.spec.ts`: 브라우저 파일 인식·편집·일괄 생성 회귀

---

### Task 1: Import domain types, normalization, and dependencies

**Files:**
- Create: `web/src/lib/import/types.ts`
- Create: `web/src/lib/import/normalize.ts`
- Test: `web/src/lib/import/normalize.test.ts`
- Modify: `web/package.json`
- Modify: `web/package-lock.json`

**Interfaces:**
- Produces: `ImportableField`, `ImportSource`, `TripImportCandidate`, `normalizeLabel(text)`, `normalizeDateText(text)`
- Consumes: no application interfaces

- [ ] **Step 1: Install browser document readers**

Run:

```powershell
cd web
npm install exceljs@4.4.0 pdfjs-dist@6.2.108
```

Expected: `package.json` contains exact compatible ranges selected by npm and `package-lock.json` resolves `exceljs` and `pdfjs-dist` without installing the unrelated `xlsx` package.

- [ ] **Step 2: Write failing normalization tests**

Create `normalize.test.ts` with literal expectations:

```ts
import { describe, expect, it } from "vitest";
import { normalizeDateText, normalizeLabel } from "./normalize";

describe("출장 입력 정규화", () => {
  it("공백이 섞인 출장 라벨을 비교 가능한 문자열로 만든다", () => {
    expect(normalizeLabel("출 장 목 적")).toBe("출장목적");
  });

  it.each([
    ["2026. 8. 27", "2026-08-27"],
    ["2026년 08월 27일", "2026-08-27"],
  ])("날짜 %s를 ISO 날짜로 바꾼다", (source, expected) => {
    expect(normalizeDateText(source)).toBe(expected);
  });

  it("실재하지 않는 날짜는 자동으로 고치지 않는다", () => {
    expect(normalizeDateText("2026.02.31")).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test and confirm RED**

Run: `npm test -- src/lib/import/normalize.test.ts`

Expected: FAIL because `./normalize` does not exist.

- [ ] **Step 4: Add exact candidate types and minimal normalization**

Create `types.ts` with these public contracts:

```ts
export const importableFields = [
  "school", "position", "name", "applicationDate",
  "tripStart", "tripEnd", "purpose", "destination",
] as const;
export type ImportableField = (typeof importableFields)[number];

export type ImportSource = {
  fileName: string;
  fileType: "xlsx" | "pdf";
  sheetName?: string;
  row?: number;
  block?: number;
  page?: number;
  hiddenSheet?: boolean;
};

export type TripImportCandidate = {
  id: string;
  source: ImportSource;
  status: "recognized" | "needs-review" | "unsupported";
  values: Partial<Record<ImportableField, string>>;
  recognizedFields: ImportableField[];
  issues: string[];
  included: boolean;
};
```

Create `normalize.ts` so `normalizeLabel` removes all Unicode whitespace and punctuation used between labels, while `normalizeDateText` validates the reconstructed UTC date before returning `yyyy-mm-dd`.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npm test -- src/lib/import/normalize.test.ts
git add package.json package-lock.json src/lib/import
git commit -m "feat: add trip import domain types"
```

Expected: normalization tests PASS.

---

### Task 2: XLSX sheet, row, and repeated-form recognition

**Files:**
- Create: `web/src/lib/import/xlsx.ts`
- Test: `web/src/lib/import/xlsx.test.ts`

**Interfaces:**
- Consumes: `TripImportCandidate`, `normalizeLabel`, `normalizeDateText`
- Produces: `parseXlsxBuffer(data: ArrayBuffer, fileName: string): Promise<TripImportCandidate[]>`

- [ ] **Step 1: Write failing workbook tests with synthetic data**

Use `new Workbook()` and `workbook.xlsx.writeBuffer()` inside the test. Cover these literal cases in separate tests:

```ts
it("여러 표시 시트의 신청서를 시트별 출장 건으로 인식한다", async () => {
  const workbook = new Workbook();
  for (const [sheetName, person] of [["첫째", "가상교사A"], ["둘째", "가상교사B"]]) {
    const sheet = workbook.addWorksheet(sheetName);
    sheet.addRow(["직급", "성명", "출장목적", "출장기간", "출장지"]);
    sheet.addRow(["교사", person, "합성 연수", "2026.08.27", "가상기관"]);
  }
  const result = await parseXlsxBuffer(await workbook.xlsx.writeBuffer(), "synthetic.xlsx");
  expect(result.map((item) => item.values.name)).toEqual(["가상교사A", "가상교사B"]);
  expect(result.map((item) => item.source.sheetName)).toEqual(["첫째", "둘째"]);
});
```

Add independent tests for: one table with two data rows; one form-style sheet with labels above/next to values; two repeated form blocks in one sheet; a hidden matching sheet returned as `needs-review` with `included: false`; a formula-only sheet ignored; identical records preserved twice; absent destination omitted rather than copied from another field.

- [ ] **Step 2: Run XLSX tests and confirm RED**

Run: `npm test -- src/lib/import/xlsx.test.ts`

Expected: FAIL because `parseXlsxBuffer` does not exist.

- [ ] **Step 3: Implement worksheet grid extraction**

In `xlsx.ts`, load the browser buffer and convert each worksheet to a sparse grid without evaluating formulas:

```ts
const workbook = new Workbook();
await workbook.xlsx.load(data);
const text = (cell: Cell): string => {
  if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
  if (typeof cell.value === "object" && cell.value && "result" in cell.value) {
    return String(cell.value.result ?? "").trim();
  }
  return cell.text.trim();
};
```

Keep each cell's row, column, text, merge master, and worksheet visibility. Never copy the workbook to disk.

- [ ] **Step 4: Implement table and form detectors**

Use one alias map shared by both detectors:

```ts
const FIELD_ALIASES: Record<ImportableField, string[]> = {
  school: ["소속", "학교"], position: ["직급", "직위"], name: ["성명", "이름"],
  applicationDate: ["신청일", "작성일"], tripStart: ["출장기간", "출장일", "일시"],
  tripEnd: ["출장기간", "출장일", "일시"], purpose: ["출장목적", "목적"],
  destination: ["출장지", "장소", "기관"],
};
```

`detectTableRecords` requires at least `name` plus two of `purpose`, `tripStart`, `destination` on one header row, then reads each non-empty row below until two consecutive empty rows. `detectFormRecords` finds the same core label set anywhere in a bounded row block and reads the nearest non-label cell to the right, then below. Split repeated forms at another `출장신청서` title or repeated core header set. Build IDs from file name + sheet index + source row/block, not from personal values.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm test -- src/lib/import/xlsx.test.ts
git add src/lib/import/xlsx.ts src/lib/import/xlsx.test.ts
git commit -m "feat: recognize trip records across xlsx sheets"
```

Expected: all XLSX structure tests PASS and no actual user file is present under `web`.

---

### Task 3: PDF page recognition from positioned text

**Files:**
- Create: `web/src/lib/import/pdf.ts`
- Test: `web/src/lib/import/pdf.test.ts`

**Interfaces:**
- Consumes: `TripImportCandidate`, normalization helpers
- Produces: `PositionedPdfText`, `parsePdfPageItems(items, source)`, `parsePdfBuffer(data, fileName)`

- [ ] **Step 1: Write failing positional parser tests**

Build literal positioned items for a synthetic application page. Place headers at fixed x positions and values below them. Assert name, purpose, period, destination, page source, and missing fields:

```ts
const items = [
  { text: "직급", x: 60, y: 700, width: 30 },
  { text: "성명", x: 150, y: 700, width: 30 },
  { text: "출장목적", x: 250, y: 700, width: 60 },
  { text: "출장기간", x: 390, y: 700, width: 60 },
  { text: "출장지", x: 520, y: 700, width: 45 },
  { text: "교사", x: 65, y: 660, width: 25 },
  { text: "가상교사", x: 150, y: 660, width: 45 },
  { text: "합성 연수", x: 245, y: 660, width: 70 },
  { text: "2026.08.27부터", x: 390, y: 670, width: 90 },
  { text: "2026.08.28까지", x: 390, y: 650, width: 90 },
  { text: "가상기관", x: 520, y: 660, width: 55 },
];
```

Add tests for one-day period, four pages preserved in order, a page without extractable text returning `unsupported`, and a page with title but ambiguous dates leaving both date fields absent.

- [ ] **Step 2: Run PDF parser tests and confirm RED**

Run: `npm test -- src/lib/import/pdf.test.ts`

Expected: FAIL because `./pdf` is missing.

- [ ] **Step 3: Implement positioned field extraction**

Define:

```ts
export type PositionedPdfText = {
  text: string;
  x: number;
  y: number;
  width: number;
};
```

Find the header row by normalized labels. Sort header centers by x and use adjacent midpoints as column boundaries. Read only items below the header and within the first populated application row. Join wrapped purpose/destination items by descending y then ascending x. Extract all valid dates inside the period column: one date maps to both start/end only when the text contains a single-day marker or no range marker; two dates map first/last chronologically.

- [ ] **Step 4: Implement the PDF.js browser adapter**

Use a client-only dynamic import and a worker URL owned by the bundle:

```ts
const pdfjs = await import("pdfjs-dist");
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
const document = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
```

For each page, retain only text items with a `str` property and map `transform[4]`/`transform[5]` to x/y. Do not render or upload pages. Catch encrypted, malformed, and text-empty pages per page/file and return a non-PII issue message.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm test -- src/lib/import/pdf.test.ts
git add src/lib/import/pdf.ts src/lib/import/pdf.test.ts
git commit -m "feat: recognize trip applications by pdf page"
```

---

### Task 4: File router and blank imported drafts

**Files:**
- Create: `web/src/lib/import/read-files.client.ts`
- Create: `web/src/lib/travel-expense/draft.ts`
- Test: `web/src/lib/import/read-files.client.test.ts`
- Test: `web/src/lib/travel-expense/draft.test.ts`
- Modify: `web/src/lib/travel-expense/schema.ts`
- Modify: `web/src/components/travel-expense/RouteEditor.tsx`

**Interfaces:**
- Consumes: `parseXlsxBuffer`, `parsePdfBuffer`, `TripImportCandidate`
- Produces: `readTripFiles(files: File[]): Promise<TripImportCandidate[]>`, `TravelExpenseDraftInput`, `candidateToDraft(candidate, templateId)`

- [ ] **Step 1: Write failing file-routing and blank-field tests**

Assert `.xlsx` and `.pdf` calls preserve file order, an unsupported extension creates one `unsupported` candidate without stopping valid files, and the draft adapter leaves every absent field blank:

```ts
const draft = candidateToDraft({
  id: "synthetic-1",
  source: { fileName: "synthetic.xlsx", fileType: "xlsx", sheetName: "신청서" },
  status: "recognized",
  values: { name: "가상교사", tripStart: "2026-08-27", tripEnd: "2026-08-27" },
  recognizedFields: ["name", "tripStart", "tripEnd"],
  issues: [], included: true,
}, "bokja-2026");
expect(draft.destination).toBe("");
expect(draft.travelType).toBe("");
expect(draft.routes[0]).toMatchObject({ transport: "", from: "", to: "", grade: "", fare: null });
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- src/lib/import/read-files.client.test.ts src/lib/travel-expense/draft.test.ts`

Expected: FAIL because the router and draft module do not exist.

- [ ] **Step 3: Add a draft-safe form type**

Keep `TravelExpenseInput` unchanged for server generation. Add `TravelExpenseDraftInput` in `draft.ts` with `travelType: TravelType | ""`, route text fields as strings, and `fare: number | "미기재" | null`. `candidateToDraft` maps only `candidate.values`; it may copy a recognized trip start into the route date because the date exists in the source, but must not populate transport, route endpoints, grade, fare, costs, school, or position unless each source field is present.

Update `RouteEditor` prop types to accept the draft route shape while preserving its current rendered controls. Keep the existing direct-entry defaults in `defaultValues()`; use blank imported defaults only for imported candidates.

- [ ] **Step 4: Implement extension routing without partial failure**

`readTripFiles` lowercases the final extension, calls the matching parser with `await file.arrayBuffer()`, catches per-file errors, and returns an `unsupported` candidate whose issues contain only a generic message and the local source locator. Do not log file contents or extracted values.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```powershell
npm test -- src/lib/import/read-files.client.test.ts src/lib/travel-expense/draft.test.ts
git add src/lib/import/read-files.client.ts src/lib/travel-expense/draft.ts src/lib/import/*.test.ts src/components/travel-expense/RouteEditor.tsx
git commit -m "feat: convert recognized records to editable drafts"
```

---

### Task 5: Candidate queue and form integration

**Files:**
- Create: `web/src/hooks/useTripDraftQueue.ts`
- Create: `web/src/hooks/useTripDraftQueue.test.ts`
- Create: `web/src/components/travel-expense/ImportPanel.tsx`
- Create: `web/src/components/travel-expense/ImportCandidateList.tsx`
- Test: `web/src/components/travel-expense/ImportPanel.test.tsx`
- Modify: `web/src/components/travel-expense/ExpenseForm.tsx`
- Modify: `web/src/components/travel-expense/ExpenseForm.test.tsx`
- Modify: `web/src/app/globals.css`

**Interfaces:**
- Consumes: `readTripFiles`, `candidateToDraft`, `TravelExpenseDraftInput`
- Produces: `useTripDraftQueue()`, `ImportPanel`, `ImportCandidateList`

- [ ] **Step 1: Write failing queue behavior tests**

Test observable state transitions: append three drafts in source order, select second while saving first's edited purpose, exclude one without deleting it, remove one from UI only, and return only included valid drafts for generation. The production mutation each test catches must be named in the test title.

- [ ] **Step 2: Run the queue test and confirm RED**

Run: `npm test -- src/hooks/useTripDraftQueue.test.ts`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the queue hook**

Expose this exact shape:

```ts
type TripDraftQueue = {
  drafts: QueuedTripDraft[];
  selectedId: string | null;
  appendCandidates(candidates: TripImportCandidate[], templateId: string): void;
  saveSelected(values: TravelExpenseDraftInput): void;
  select(id: string, currentValues: TravelExpenseDraftInput): TravelExpenseDraftInput;
  setIncluded(id: string, included: boolean): void;
  remove(id: string): void;
};
```

Use functional React state updates so rapid file parsing cannot drop candidates. Do not persist queue contents to `localStorage`.

- [ ] **Step 4: Write failing component tests**

In `ImportPanel.test.tsx`, upload one synthetic XLSX and one synthetic PDF and assert file-level progress, source labels, and candidate count. In `ExpenseForm.test.tsx`, assert selecting another candidate saves the current edit, missing destination remains empty with `직접 입력 필요`, excluded records are omitted from the generated request, and the existing single-form tests still render.

- [ ] **Step 5: Run component tests and confirm RED**

Run: `npm test -- src/components/travel-expense/ImportPanel.test.tsx src/components/travel-expense/ExpenseForm.test.tsx`

Expected: FAIL because import controls and candidate list are absent.

- [ ] **Step 6: Implement accessible import and list UI**

`ImportPanel` renders `<input type="file" accept=".xlsx,.pdf" multiple>` and an explicit privacy note that original files are analyzed in the browser. `ImportCandidateList` uses buttons with accessible names containing source location, status, and inclusion checkbox. Show `파일명 > 시트명 > 행/블록` or `파일명 > N쪽`; do not put extracted values into console output or DOM data attributes.

In `ExpenseForm`, switch `useForm` to `TravelExpenseDraftInput`, call `queue.saveSelected(getValues())` before `reset(queue.select(...))`, and parse each included draft through `travelExpenseSchema.safeParse` only at generation time. Preserve direct-entry mode and current confirmation invalidation.

- [ ] **Step 7: Add responsive styles, verify, and commit**

Add desktop list/editor columns and collapse to one column under the existing mobile breakpoint. Run:

```powershell
npm test -- src/hooks/useTripDraftQueue.test.ts src/components/travel-expense/ImportPanel.test.tsx src/components/travel-expense/ExpenseForm.test.tsx
git add src/hooks src/components/travel-expense src/app/globals.css
git commit -m "feat: edit imported trip records as a batch"
```

---

### Task 6: Batch schema and multi-page PDF generation

**Files:**
- Create: `web/src/lib/travel-expense/batch-schema.ts`
- Test: `web/src/lib/travel-expense/batch-schema.test.ts`
- Modify: `web/src/lib/pdf/generate-pdf.ts`
- Modify: `web/src/lib/pdf/generate-pdf.test.ts`
- Modify: `web/src/app/api/generate/pdf/route.ts`
- Modify: `web/src/app/api/generate/pdf/route.test.ts`
- Modify: `web/src/lib/travel-expense/transform.ts`
- Modify: `web/src/lib/travel-expense/transform.test.ts`

**Interfaces:**
- Produces: `parseTravelExpenseBatch(value): TravelExpenseInput[]`, `generatePdfBatch(inputs)`, `makeBatchDownloadFilename(inputs, format)`
- Consumes: `travelExpenseSchema`, PDF template registry

- [ ] **Step 1: Write failing schema and PDF page-count tests**

Assert object input becomes a one-element array, arrays of 1 and 40 pass, empty and 41 fail, mixed template IDs fail, and `generatePdfBatch([first, second, third])` returns a PDF with exactly three pages in that order.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- src/lib/travel-expense/batch-schema.test.ts src/lib/pdf/generate-pdf.test.ts`

Expected: FAIL for missing batch APIs.

- [ ] **Step 3: Implement request normalization and PDF page cloning**

`parseTravelExpenseBatch` first wraps non-array JSON, then uses `z.array(travelExpenseSchema).min(1).max(40)` and a refinement that every `templateId` equals the first item. Refactor drawing into `drawExpensePage(page, font, fieldMap, input)`.

`generatePdfBatch` creates one output document, embeds the font once, loads the selected template once, copies template page zero for every input, draws that input, and returns `document.save({ useObjectStreams: false })`. Keep `generatePdf(input)` as `generatePdfBatch([input])` so current callers remain valid.

- [ ] **Step 4: Update the PDF route and client filename**

The route calls `parseTravelExpenseBatch(await request.json())`, uses `generatePdfBatch`, and names arrays with `여비정산신청서_일괄_<N>건.pdf`; one-object requests retain the current single-person filename. In `ExpenseForm`, send the included parsed array for batch mode and a single object for direct mode.

- [ ] **Step 5: Verify route behavior and commit**

Run:

```powershell
npm test -- src/lib/travel-expense/batch-schema.test.ts src/lib/pdf/generate-pdf.test.ts src/app/api/generate/pdf/route.test.ts src/lib/travel-expense/transform.test.ts
git add src/lib/travel-expense src/lib/pdf src/app/api/generate/pdf src/components/travel-expense/ExpenseForm.tsx
git commit -m "feat: generate batch trips as one pdf"
```

---

### Task 7: HWP template section duplication primitive

**Files:**
- Modify: `web/vendor/claw-hwp/cell-patch.mjs`
- Create: `web/src/lib/hwp/duplicate-sections.test.ts`
- Modify: `web/src/lib/hwp/runtime-packaging.test.ts`

**Interfaces:**
- Produces: `duplicateSectionsInPlace(filePath: string, sectionCount: number): Promise<{ sectionCount: number }>` from the vendored patch module
- Consumes: vendored SheetJS CFB module and compressed HWP streams

- [ ] **Step 1: Write a failing CFB structure test**

Copy the synthetic template to a temp directory, call `duplicateSectionsInPlace(path, 3)`, parse the result with vendored CFB, and assert exact stream paths `Section0`, `Section1`, `Section2` with no `Section3`. Inflate `DocInfo`, locate the HWP `DOCUMENT_PROPERTIES` record (`tag === 0x10`), and assert `readUInt16LE(dataOff) === 3`. Also assert the source template bytes did not change.

- [ ] **Step 2: Run the duplication test and confirm RED**

Run: `npm test -- src/lib/hwp/duplicate-sections.test.ts`

Expected: FAIL because the export is missing.

- [ ] **Step 3: Implement atomic section duplication**

Inside `cell-patch.mjs`, validate `sectionCount` is an integer from 1 through 40. Parse the existing file with vendored CFB, find `Root Entry/BodyText/Section0`, remove pre-existing `Section1..Section39` only in the temporary copied output, and add exact byte copies with `CFB.utils.cfb_add(cfb, "BodyText/SectionN", Buffer.from(source.content))`.

Inflate `Root Entry/DocInfo`, parse records with the existing record walker, set the first two bytes of the `0x10` record body to `sectionCount`, deflate at level 9, update stream content/size, and write to a sibling temporary file before renaming over `filePath`. A thrown error must leave the previous output file intact.

- [ ] **Step 4: Verify runtime packaging and commit**

Run:

```powershell
npm test -- src/lib/hwp/duplicate-sections.test.ts src/lib/hwp/runtime-packaging.test.ts
git add vendor/claw-hwp/cell-patch.mjs src/lib/hwp
git commit -m "feat: duplicate hwp template sections safely"
```

Expected: CFB structure tests PASS and the runtime packaging test proves the new export is available in production.

---

### Task 8: Multi-section HWP generation and route

**Files:**
- Modify: `web/src/lib/hwp/generate-hwp.ts`
- Modify: `web/src/lib/hwp/generate-hwp.test.ts`
- Modify: `web/src/app/api/generate/hwp/route.ts`
- Modify: `web/src/app/api/generate/hwp/route.test.ts`

**Interfaces:**
- Consumes: `parseTravelExpenseBatch`, `duplicateSectionsInPlace`, `patchCellsInPlace`
- Produces: `generateHwpBatch(inputs: TravelExpenseInput[]): Promise<Uint8Array>`

- [ ] **Step 1: Write failing multi-section content tests**

Generate two records with distinct synthetic names and purposes. Parse each `BodyText/SectionN`, inflate it, and assert its raw UTF-16LE record data contains only its assigned synthetic values. Assert CFB magic, two section streams, DocInfo count two, and unchanged original template. Add a 41-record rejection route test.

- [ ] **Step 2: Run HWP tests and confirm RED**

Run: `npm test -- src/lib/hwp/generate-hwp.test.ts src/app/api/generate/hwp/route.test.ts`

Expected: FAIL because `generateHwpBatch` and array route input are absent.

- [ ] **Step 3: Implement section-aware cell edits**

Change `buildCellEdits(input, fieldMap, section = fieldMap.table.section)` so every edit uses the passed section. In `generateHwpBatch`, parse all inputs, require one template ID, copy the template once, call `duplicateSectionsInPlace(outputPath, parsed.length)`, concatenate `buildCellEdits(input, map, index)` for each input, and call `patchCellsInPlace` once. Keep `generateHwp(input)` as `generateHwpBatch([input])`.

- [ ] **Step 4: Update HWP route and errors**

Normalize object/array request bodies with `parseTravelExpenseBatch`, call `generateHwpBatch`, return the batch filename for arrays, and preserve `private, no-store`. Return 400 for schema/count errors and 500 for section duplication or patch failures without including names, purposes, or file paths in the response.

- [ ] **Step 5: Verify focused HWP suite and commit**

Run:

```powershell
npm test -- src/lib/hwp/generate-hwp.test.ts src/lib/hwp/duplicate-sections.test.ts src/app/api/generate/hwp/route.test.ts
git add src/lib/hwp src/app/api/generate/hwp
git commit -m "feat: generate batch trips as one hwp"
```

---

### Task 9: Browser regression, full verification, and handoff

**Files:**
- Create: `web/e2e/batch-import.spec.ts`
- Modify: `web/e2e/travel-expense.spec.ts`
- Modify: `web/README.md`

**Interfaces:**
- Consumes: completed import UI and batch generation routes
- Produces: release evidence; no new runtime API

- [ ] **Step 1: Write failing Playwright batch flow**

Create synthetic XLSX bytes during the test with ExcelJS, upload through `setInputFiles`, assert two source records from two sheets, verify an unrecognized destination is blank, fill missing route fields manually, include both records, and download one PDF. Load the download with `pdf-lib` and assert two pages. Add a separate HWP download assertion for CFB magic and a nonzero file size.

- [ ] **Step 2: Run E2E and confirm RED before final UI wiring**

Run: `npm run test:e2e -- e2e/batch-import.spec.ts`

Expected: FAIL at the first missing batch selector or behavior not yet connected.

- [ ] **Step 3: Complete only wiring exposed by the E2E failure**

Add stable accessible names rather than test IDs: `출장 신청서 파일`, `출장 건 <N>`, `출력에 포함`, `일괄 HWP 내려받기`, `일괄 PDF 내려받기`. Fix the first real behavior failure, rerun, and repeat until the batch E2E passes without weakening assertions.

- [ ] **Step 4: Document supported inputs and privacy boundary**

Update README with: XLSX table/form/sheet support, text-PDF page support, no OCR, blank unknown fields, 40-record limit, client-side original parsing, normalized values sent only for generation, and one-page-per-record HWP/PDF output.

- [ ] **Step 5: Run the complete automated gate**

Run:

```powershell
npm test
npm run lint -- --ignore-pattern .vercel
npm run build
npm run test:e2e
npm audit --omit=dev
git diff --check
git status --short
```

Expected: all tests, lint, build, E2E, and diff checks PASS. Report any dependency audit finding separately; do not change package versions or ignore policy merely to force green.

- [ ] **Step 6: Verify supplied-file recognition without persisting PII**

On the local development page, select the supplied XLSX and PDF. Record only structural results: workbook candidate count and source locators; PDF page candidate count; recognized field names; unsupported/blank field names. Do not screenshot, print, log, or commit extracted values. Confirm the originals' hashes are unchanged after the test.

- [ ] **Step 7: Perform real HWP compatibility verification**

Generate a two-page HWP using synthetic values, open it in installed 한컴오피스 한글 or 한컴독스, and confirm: document opens without repair prompt; exactly two pages; each page contains only its assigned synthetic record; tables, borders, fonts, and page breaks match the original template. The claw-hwp browser preview may be used as visual feedback but must not be reported as this compatibility verification.

- [ ] **Step 8: Commit the verified feature**

Run:

```powershell
git add e2e README.md
git commit -m "test: verify batch trip import workflow"
git status --short
```

Expected: clean worktree except explicitly documented ignored local artifacts. Do not deploy.
