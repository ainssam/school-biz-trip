import { strFromU8, unzipSync } from "fflate";
import { normalizeDateText, normalizeLabel } from "./normalize";
import {
  importableFields,
  type ImportableField,
  type TripImportCandidate,
} from "./types";

type GridCell = {
  row: number;
  column: number;
  text: string;
};

type SheetGrid = {
  name: string;
  hidden: boolean;
  index: number;
  cells: GridCell[];
  rows: Map<number, Map<number, string>>;
};

type HeaderField = ImportableField | "period";

const FIELD_ALIASES: Record<HeaderField, string[]> = {
  school: ["소속", "학교", "소속학교"],
  position: ["직급", "직위", "직급직위"],
  name: ["성명", "이름"],
  applicationDate: ["신청일", "작성일", "신청일자"],
  tripStart: ["시작일", "출장시작일"],
  tripEnd: ["종료일", "출장종료일"],
  purpose: ["출장목적", "목적"],
  destination: ["출장지", "장소", "기관"],
  period: ["출장기간", "출장일", "출장일시", "일시"],
};

const REQUIRED_DRAFT_FIELDS: ImportableField[] = [
  "school",
  "position",
  "name",
  "tripStart",
  "tripEnd",
  "purpose",
  "destination",
];

const ISSUE_LABELS: Record<ImportableField, string> = {
  school: "소속",
  position: "직급(직위)",
  name: "성명",
  applicationDate: "신청일",
  tripStart: "출장 시작일",
  tripEnd: "출장 종료일",
  purpose: "출장목적",
  destination: "출장지",
};

function parseXml(bytes: Uint8Array, path: string): XMLDocument {
  const document = new DOMParser().parseFromString(
    strFromU8(bytes),
    "application/xml",
  );
  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error(`XLSX XML을 읽을 수 없습니다: ${path}`);
  }
  return document;
}

function childText(element: Element, localName: string): string {
  return Array.from(element.getElementsByTagNameNS("*", localName))
    .map((node) => node.textContent ?? "")
    .join("");
}

function workbookTarget(target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  return `xl/${target.replace(/^\.\//, "")}`;
}

function referencePosition(reference: string): { row: number; column: number } {
  const match = reference.match(/^([A-Z]+)(\d+)$/i);
  if (!match) throw new Error("XLSX 셀 주소가 올바르지 않습니다.");
  let column = 0;
  for (const character of match[1].toUpperCase()) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }
  return { row: Number(match[2]), column };
}

function readSharedStrings(document?: XMLDocument): string[] {
  if (!document) return [];
  return Array.from(document.getElementsByTagNameNS("*", "si")).map((item) =>
    childText(item, "t"),
  );
}

function readCellText(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") return childText(cell, "t").trim();
  const raw = childText(cell, "v").trim();
  if (type === "s") return (sharedStrings[Number(raw)] ?? "").trim();
  if (type === "b") return raw === "1" ? "TRUE" : "FALSE";
  return raw;
}

function readSheets(files: Record<string, Uint8Array>): SheetGrid[] {
  const workbookBytes = files["xl/workbook.xml"];
  const relationshipBytes = files["xl/_rels/workbook.xml.rels"];
  if (!workbookBytes || !relationshipBytes) {
    throw new Error("XLSX 워크북 구조가 없습니다.");
  }

  const workbook = parseXml(workbookBytes, "xl/workbook.xml");
  const relationships = parseXml(
    relationshipBytes,
    "xl/_rels/workbook.xml.rels",
  );
  const relationshipMap = new Map(
    Array.from(relationships.getElementsByTagNameNS("*", "Relationship")).map(
      (relationship) => [
        relationship.getAttribute("Id") ?? "",
        relationship.getAttribute("Target") ?? "",
      ],
    ),
  );
  const sharedStrings = readSharedStrings(
    files["xl/sharedStrings.xml"]
      ? parseXml(files["xl/sharedStrings.xml"], "xl/sharedStrings.xml")
      : undefined,
  );

  return Array.from(workbook.getElementsByTagNameNS("*", "sheet")).map(
    (sheet, index) => {
      const relationshipId =
        sheet.getAttributeNS(
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "id",
        ) ?? sheet.getAttribute("r:id");
      const target = relationshipId
        ? relationshipMap.get(relationshipId)
        : undefined;
      if (!target) throw new Error("XLSX 시트 연결 정보를 찾을 수 없습니다.");
      const path = workbookTarget(target);
      const sheetBytes = files[path];
      if (!sheetBytes) throw new Error("XLSX 시트 내용을 찾을 수 없습니다.");
      const document = parseXml(sheetBytes, path);
      const cells = Array.from(document.getElementsByTagNameNS("*", "c"))
        .map((cell): GridCell | null => {
          const reference = cell.getAttribute("r");
          if (!reference) return null;
          const position = referencePosition(reference);
          return { ...position, text: readCellText(cell, sharedStrings) };
        })
        .filter((cell): cell is GridCell => Boolean(cell && cell.text));
      const rows = new Map<number, Map<number, string>>();
      for (const cell of cells) {
        if (!rows.has(cell.row)) rows.set(cell.row, new Map());
        rows.get(cell.row)?.set(cell.column, cell.text);
      }
      return {
        name: sheet.getAttribute("name") ?? `시트 ${index + 1}`,
        hidden: (sheet.getAttribute("state") ?? "visible") !== "visible",
        index,
        cells,
        rows,
      };
    },
  );
}

function fieldForLabel(text: string): HeaderField | null {
  const normalized = normalizeLabel(text);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
    [HeaderField, string[]]
  >) {
    if (aliases.some((alias) => normalizeLabel(alias) === normalized)) {
      return field;
    }
  }
  return null;
}

function parsePeriod(
  text: string,
): Pick<Partial<Record<ImportableField, string>>, "tripStart" | "tripEnd"> {
  const matches =
    text
      .normalize("NFKC")
      .match(/20\d{2}\s*(?:년|[./-])\s*\d{1,2}\s*(?:월|[./-])\s*\d{1,2}\s*일?/g) ??
    [];
  const dates = Array.from(
    new Set(matches.map(normalizeDateText).filter((date): date is string => !!date)),
  ).sort();
  if (dates.length === 0) return {};
  return {
    tripStart: dates[0],
    tripEnd: dates.length === 1 ? dates[0] : dates[dates.length - 1],
  };
}

function setFieldValue(
  values: Partial<Record<ImportableField, string>>,
  field: HeaderField,
  text: string,
): void {
  const value = text.trim();
  if (!value) return;
  if (field === "period") {
    Object.assign(values, parsePeriod(value));
    return;
  }
  if (
    field === "applicationDate" ||
    field === "tripStart" ||
    field === "tripEnd"
  ) {
    const date = normalizeDateText(value);
    if (date) values[field] = date;
    return;
  }
  values[field] = value;
}

function issuesFor(
  values: Partial<Record<ImportableField, string>>,
): string[] {
  return REQUIRED_DRAFT_FIELDS.filter((field) => !values[field]).map(
    (field) => `${ISSUE_LABELS[field]} 직접 입력 필요`,
  );
}

function qualifies(values: Partial<Record<ImportableField, string>>): boolean {
  const supporting = [
    Boolean(values.purpose),
    Boolean(values.tripStart),
    Boolean(values.destination),
  ].filter(Boolean).length;
  return Boolean(values.name) && supporting >= 2;
}

function makeCandidate(
  fileName: string,
  sheet: SheetGrid,
  locator: { row?: number; block?: number },
  values: Partial<Record<ImportableField, string>>,
): TripImportCandidate {
  const issues = issuesFor(values);
  return {
    id: [
      fileName,
      `sheet-${sheet.index + 1}`,
      locator.row ? `row-${locator.row}` : `block-${locator.block}`,
    ].join(":"),
    source: {
      fileName,
      fileType: "xlsx",
      sheetName: sheet.name,
      ...locator,
      ...(sheet.hidden ? { hiddenSheet: true } : {}),
    },
    status: sheet.hidden || issues.length ? "needs-review" : "recognized",
    values,
    recognizedFields: importableFields.filter((field) => Boolean(values[field])),
    issues: sheet.hidden
      ? ["숨김 시트에서 발견되어 포함 여부 확인 필요", ...issues]
      : issues,
    included: !sheet.hidden,
  };
}

function headerAt(
  row: Map<number, string>,
): Map<number, HeaderField> | null {
  const fields = new Map<number, HeaderField>();
  for (const [column, text] of row) {
    const field = fieldForLabel(text);
    if (field) fields.set(column, field);
  }
  const present = new Set(fields.values());
  const supporting = ["purpose", "period", "tripStart", "destination"].filter(
    (field) => present.has(field as HeaderField),
  ).length;
  return present.has("name") && supporting >= 2 ? fields : null;
}

function detectTableRecords(
  fileName: string,
  sheet: SheetGrid,
): TripImportCandidate[] {
  const rowNumbers = Array.from(sheet.rows.keys()).sort((a, b) => a - b);
  const candidates: TripImportCandidate[] = [];
  for (const headerRowNumber of rowNumbers) {
    const header = headerAt(sheet.rows.get(headerRowNumber) ?? new Map());
    if (!header) continue;
    let emptyRows = 0;
    for (
      let rowNumber = headerRowNumber + 1;
      rowNumber <= (rowNumbers.at(-1) ?? headerRowNumber);
      rowNumber += 1
    ) {
      const row = sheet.rows.get(rowNumber) ?? new Map();
      if (headerAt(row)) break;
      if (row.size === 0) {
        emptyRows += 1;
        if (emptyRows >= 2) break;
        continue;
      }
      emptyRows = 0;
      const values: Partial<Record<ImportableField, string>> = {};
      for (const [column, field] of header) {
        setFieldValue(values, field, row.get(column) ?? "");
      }
      if (qualifies(values)) {
        candidates.push(makeCandidate(fileName, sheet, { row: rowNumber }, values));
      }
    }
  }
  return candidates;
}

function blockRanges(sheet: SheetGrid): Array<{ start: number; end: number }> {
  const maxRow = Math.max(0, ...sheet.rows.keys());
  const titles = Array.from(sheet.rows.entries())
    .filter(([, row]) =>
      Array.from(row.values()).some((value) =>
        normalizeLabel(value).includes("출장신청서"),
      ),
    )
    .map(([rowNumber]) => rowNumber)
    .sort((a, b) => a - b);
  if (titles.length === 0) return maxRow ? [{ start: 1, end: maxRow }] : [];
  return titles.map((start, index) => ({
    start,
    end: (titles[index + 1] ?? maxRow + 1) - 1,
  }));
}

function nearestValueToRight(
  row: Map<number, string>,
  labelColumn: number,
): string {
  const maxColumn = Math.max(0, ...row.keys());
  for (let column = labelColumn + 1; column <= maxColumn; column += 1) {
    const value = row.get(column);
    if (!value) continue;
    if (fieldForLabel(value)) return "";
    return value;
  }
  return "";
}

function detectFormRecords(
  fileName: string,
  sheet: SheetGrid,
): TripImportCandidate[] {
  return blockRanges(sheet)
    .map(({ start, end }, blockIndex) => {
      const values: Partial<Record<ImportableField, string>> = {};
      for (let rowNumber = start; rowNumber <= end; rowNumber += 1) {
        const row = sheet.rows.get(rowNumber) ?? new Map();
        for (const [column, text] of row) {
          const field = fieldForLabel(text);
          if (!field) continue;
          setFieldValue(values, field, nearestValueToRight(row, column));
        }
      }
      return qualifies(values)
        ? makeCandidate(fileName, sheet, { block: blockIndex + 1 }, values)
        : null;
    })
    .filter((candidate): candidate is TripImportCandidate => !!candidate);
}

export async function parseXlsxBuffer(
  data: ArrayBuffer,
  fileName: string,
): Promise<TripImportCandidate[]> {
  const files = unzipSync(new Uint8Array(data));
  return readSheets(files).flatMap((sheet) => {
    const tableRecords = detectTableRecords(fileName, sheet);
    return tableRecords.length > 0
      ? tableRecords
      : detectFormRecords(fileName, sheet);
  });
}
