import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseXlsxBuffer } from "./xlsx";

type SyntheticSheet = {
  name: string;
  rows: Array<Array<string | null>>;
  hidden?: boolean;
};

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index: number): string {
  let value = index;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function worksheetXml(rows: SyntheticSheet["rows"]): string {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          if (value == null) return "";
          const reference = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
          return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <sheetData>${body}</sheetData>
    </worksheet>`;
}

function makeSyntheticXlsx(sheets: SyntheticSheet[]): ArrayBuffer {
  const workbookSheets = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}"${sheet.hidden ? ' state="hidden"' : ""} r:id="rId${index + 1}"/>`,
    )
    .join("");
  const relationships = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  const overrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`,
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`,
    ),
  };
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
      worksheetXml(sheet.rows),
    );
  });

  const zipped = zipSync(files);
  return zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength,
  ) as ArrayBuffer;
}

function makeSharedStringXlsx(): ArrayBuffer {
  const values = [
    "직급",
    "성명",
    "출장목적",
    "출장기간",
    "출장지",
    "교사",
    "가상교사",
    "합성 연수",
    "2026.08.27",
    "가상기관",
  ];
  const sharedStrings = values
    .map((value) => `<si><t>${xmlEscape(value)}</t></si>`)
    .join("");
  const cells = values
    .map((_, index) => {
      const row = index < 5 ? 1 : 2;
      const column = (index % 5) + 1;
      return `<c r="${columnName(column)}${row}" t="s"><v>${index}</v></c>`;
    })
    .join("");
  const files = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="공유문자열" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    "xl/sharedStrings.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="10" uniqueCount="10">${sharedStrings}</sst>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${cells.slice(0, cells.indexOf('<c r="A2'))}</row><row r="2">${cells.slice(cells.indexOf('<c r="A2'))}</row></sheetData></worksheet>`,
    ),
  };
  const zipped = zipSync(files);
  return zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength,
  ) as ArrayBuffer;
}

describe("XLSX 출장 신청서 인식", () => {
  it("여러 표시 시트의 신청서를 시트별 출장 건으로 인식한다", async () => {
    const data = makeSyntheticXlsx([
      {
        name: "첫째",
        rows: [
          ["직급", "성명", "출장목적", "출장기간", "출장지"],
          ["교사", "가상교사A", "합성 연수", "2026.08.27", "가상기관A"],
        ],
      },
      {
        name: "둘째",
        rows: [
          ["직급", "성명", "출장목적", "출장기간", "출장지"],
          ["교사", "가상교사B", "합성 회의", "2026.08.28", "가상기관B"],
        ],
      },
    ]);

    const result = await parseXlsxBuffer(data, "synthetic.xlsx");

    expect(result.map((item) => item.values.name)).toEqual([
      "가상교사A",
      "가상교사B",
    ]);
    expect(result.map((item) => item.source.sheetName)).toEqual([
      "첫째",
      "둘째",
    ]);
  });

  it("한 표의 데이터 행을 각각 독립된 출장 건으로 유지한다", async () => {
    const data = makeSyntheticXlsx([
      {
        name: "목록",
        rows: [
          ["직급", "성명", "출장목적", "출장기간", "출장지"],
          ["교사", "가상교사A", "합성 연수", "2026.08.27", "가상기관"],
          ["교사", "가상교사B", "합성 회의", "2026.08.28", "가상기관"],
        ],
      },
    ]);

    const result = await parseXlsxBuffer(data, "rows.xlsx");

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.source.row)).toEqual([2, 3]);
  });

  it("공유 문자열로 저장된 셀도 실제 표시값으로 인식한다", async () => {
    const [result] = await parseXlsxBuffer(
      makeSharedStringXlsx(),
      "shared.xlsx",
    );

    expect(result.values).toMatchObject({
      name: "가상교사",
      purpose: "합성 연수",
      destination: "가상기관",
    });
  });

  it("라벨 옆 값으로 구성된 신청서형 시트를 한 건으로 인식한다", async () => {
    const data = makeSyntheticXlsx([
      {
        name: "신청서",
        rows: [
          ["출장신청서"],
          ["직급", "교사", "성명", "가상교사"],
          ["출장목적", "합성 연수"],
          ["출장기간", "2026.08.27"],
          ["출장지", "가상기관"],
        ],
      },
    ]);

    const [result] = await parseXlsxBuffer(data, "form.xlsx");

    expect(result.values).toMatchObject({
      position: "교사",
      name: "가상교사",
      purpose: "합성 연수",
      tripStart: "2026-08-27",
      tripEnd: "2026-08-27",
      destination: "가상기관",
    });
    expect(result.source.block).toBe(1);
  });

  it("한 시트에서 반복되는 신청서 블록을 분리한다", async () => {
    const data = makeSyntheticXlsx([
      {
        name: "반복양식",
        rows: [
          ["출장신청서"],
          ["성명", "가상교사A"],
          ["출장목적", "합성 연수"],
          ["출장기간", "2026.08.27"],
          ["출장지", "가상기관A"],
          [null],
          ["출장신청서"],
          ["성명", "가상교사B"],
          ["출장목적", "합성 회의"],
          ["출장기간", "2026.08.28"],
          ["출장지", "가상기관B"],
        ],
      },
    ]);

    const result = await parseXlsxBuffer(data, "blocks.xlsx");

    expect(result.map((item) => item.values.name)).toEqual([
      "가상교사A",
      "가상교사B",
    ]);
    expect(result.map((item) => item.source.block)).toEqual([1, 2]);
  });

  it("숨김 시트의 명확한 신청서는 자동 포함하지 않는다", async () => {
    const data = makeSyntheticXlsx([
      {
        name: "숨김",
        hidden: true,
        rows: [
          ["직급", "성명", "출장목적", "출장기간", "출장지"],
          ["교사", "가상교사", "합성 연수", "2026.08.27", "가상기관"],
        ],
      },
    ]);

    const [result] = await parseXlsxBuffer(data, "hidden.xlsx");

    expect(result.status).toBe("needs-review");
    expect(result.included).toBe(false);
    expect(result.source.hiddenSheet).toBe(true);
  });

  it("출장 핵심 라벨이 없는 계산용 시트는 후보로 만들지 않는다", async () => {
    const data = makeSyntheticXlsx([
      { name: "계산", rows: [["합계", "비율"], ["100", "0.5"]] },
    ]);

    expect(await parseXlsxBuffer(data, "calculation.xlsx")).toEqual([]);
  });

  it("내용이 같은 두 행을 자동 중복 삭제하지 않는다", async () => {
    const row = ["교사", "가상교사", "합성 연수", "2026.08.27", "가상기관"];
    const data = makeSyntheticXlsx([
      {
        name: "목록",
        rows: [
          ["직급", "성명", "출장목적", "출장기간", "출장지"],
          row,
          row,
        ],
      },
    ]);

    expect(await parseXlsxBuffer(data, "duplicates.xlsx")).toHaveLength(2);
  });

  it("원본에 없는 출장지는 다른 필드에서 추정하지 않는다", async () => {
    const data = makeSyntheticXlsx([
      {
        name: "목록",
        rows: [
          ["직급", "성명", "출장목적", "출장기간"],
          ["교사", "가상교사", "가상기관 방문", "2026.08.27"],
        ],
      },
    ]);

    const [result] = await parseXlsxBuffer(data, "missing.xlsx");

    expect(result.values.destination).toBeUndefined();
    expect(result.issues).toContain("출장지 직접 입력 필요");
  });
});
