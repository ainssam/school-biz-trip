import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sheetXml(name: string): string {
  const headers = [
    "소속",
    "직급",
    "성명",
    "작성일",
    "출장목적",
    "출장기간",
    "출장지",
  ];
  const values = [
    "복자여자고등학교",
    "교사",
    name,
    "2026.08.26",
    "합성 연수",
    "2026.08.27",
    "가상기관",
  ];
  const row = (items: string[], rowNumber: number) =>
    items
      .map(
        (value, index) =>
          `<c r="${String.fromCharCode(65 + index)}${rowNumber}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`,
      )
      .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${row(headers, 1)}</row><row r="2">${row(values, 2)}</row></sheetData></worksheet>`;
}

function syntheticWorkbook(): Buffer {
  const files = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="첫째" sheetId="1" r:id="rId1"/><sheet name="둘째" sheetId="2" r:id="rId2"/></sheets></workbook>',
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml("가상교사A")),
    "xl/worksheets/sheet2.xml": strToU8(sheetXml("가상교사B")),
  };
  return Buffer.from(zipSync(files));
}

async function uploadAndCompleteBatch(page: Page) {
  await page.goto("/");
  await page.getByLabel("출장 신청서 파일").setInputFiles({
    name: "synthetic.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: syntheticWorkbook(),
  });
  await expect(page.getByRole("button", { name: /출장 건 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /출장 건 2/ })).toBeVisible();

  for (const index of [1, 2]) {
    await page.getByRole("button", { name: new RegExp(`출장 건 ${index}`) }).click();
    await page.getByLabel("출장유형").selectOption("public");
    await page.getByLabel("등급 1").selectOption("제2호");
    await page.getByLabel("출발지 1").fill("가상출발");
    await page.getByLabel("도착지 1").fill("가상도착");
  }
  await page
    .getByRole("checkbox", { name: "입력 내용을 확인했습니다." })
    .check();
}

test("출장 건 목록을 데스크톱 4열·모바일 1열로 배치한다", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const workbook = syntheticWorkbook();
  await page.getByLabel("출장 신청서 파일").setInputFiles([
    {
      name: "synthetic-a.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: workbook,
    },
    {
      name: "synthetic-b.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: workbook,
    },
  ]);
  await expect(page.getByRole("button", { name: /출장 건 4/ })).toBeVisible();

  const columnCount = await page.locator(".candidate-list").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").length,
  );
  expect(columnCount).toBe(
    testInfo.project.name === "desktop-chromium" ? 4 : 1,
  );
});

test("여러 시트의 출장 건을 한 다중 페이지 PDF로 내려받는다", async ({
  page,
}) => {
  await uploadAndCompleteBatch(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "일괄 PDF 내려받기" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("PDF 다운로드 경로가 없습니다.");
  const document = await PDFDocument.load(await readFile(downloadPath));

  expect(download.suggestedFilename()).toBe(
    "여비정산신청서_일괄_2건.pdf",
  );
  expect(document.getPageCount()).toBe(2);
});

test("여러 시트의 출장 건을 한 다중 섹션 HWP로 내려받는다", async ({
  page,
}) => {
  await uploadAndCompleteBatch(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "일괄 HWP 내려받기" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("HWP 다운로드 경로가 없습니다.");
  const bytes = await readFile(downloadPath);

  expect(download.suggestedFilename()).toBe(
    "여비정산신청서_일괄_2건.hwp",
  );
  expect(bytes.subarray(0, 8).toString("hex")).toBe(
    "d0cf11e0a1b11ae1",
  );
  expect(bytes.length).toBeGreaterThan(10_000);
});
