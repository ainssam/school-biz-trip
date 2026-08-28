import { normalizeDateText, normalizeLabel } from "./normalize";
import {
  importableFields,
  type ImportSource,
  type ImportableField,
  type TripImportCandidate,
} from "./types";

export type PositionedPdfText = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type PdfHeaderField = "position" | "name" | "purpose" | "period" | "destination";

const HEADER_ALIASES: Record<PdfHeaderField, string[]> = {
  position: ["직급", "직위", "직급직위"],
  name: ["성명", "이름"],
  purpose: ["출장목적", "목적"],
  period: ["출장기간", "출장일", "출장일시", "일시"],
  destination: ["출장지", "장소", "기관"],
};

const REQUIRED_FIELDS: Array<[ImportableField, string]> = [
  ["school", "소속"],
  ["position", "직급(직위)"],
  ["name", "성명"],
  ["tripStart", "출장 시작일"],
  ["tripEnd", "출장 종료일"],
  ["purpose", "출장목적"],
  ["destination", "출장지"],
];

function headerField(text: string): PdfHeaderField | null {
  const normalized = normalizeLabel(text);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [PdfHeaderField, string[]]
  >) {
    if (aliases.some((alias) => normalizeLabel(alias) === normalized)) {
      return field;
    }
  }
  return null;
}

function center(item: PositionedPdfText): number {
  return item.x + item.width / 2;
}

function dateValues(text: string): string[] {
  const matches =
    text
      .normalize("NFKC")
      .match(/20\d{2}\s*(?:년|[./-])\s*\d{1,2}\s*(?:월|[./-])\s*\d{1,2}\s*일?/g) ??
    [];
  return Array.from(
    new Set(matches.map(normalizeDateText).filter((date): date is string => !!date)),
  ).sort();
}

function pageIssueCandidate(
  source: ImportSource,
  issue: string,
): TripImportCandidate {
  return {
    id: `${source.fileName}:page-${source.page ?? 1}`,
    source,
    status: "unsupported",
    values: {},
    recognizedFields: [],
    issues: [issue],
    included: false,
  };
}

function joinedColumnText(items: PositionedPdfText[]): string {
  return [...items]
    .sort((left, right) => right.y - left.y || left.x - right.x)
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePdfPageItems(
  items: PositionedPdfText[],
  source: ImportSource,
): TripImportCandidate {
  if (items.length === 0) {
    return pageIssueCandidate(source, "텍스트를 읽을 수 없는 PDF 페이지");
  }

  const headers = items
    .map((item) => ({ item, field: headerField(item.text) }))
    .filter(
      (
        entry,
      ): entry is { item: PositionedPdfText; field: PdfHeaderField } =>
        entry.field !== null,
    );
  const byField = new Map<PdfHeaderField, PositionedPdfText>();
  for (const header of headers) {
    if (!byField.has(header.field)) byField.set(header.field, header.item);
  }
  if (
    !byField.has("name") ||
    !byField.has("purpose") ||
    !byField.has("period") ||
    !byField.has("destination")
  ) {
    return pageIssueCandidate(source, "출장 신청서 머리글을 찾을 수 없는 PDF 페이지");
  }

  const orderedHeaders = Array.from(byField.entries())
    .map(([field, item]) => ({ field, item, x: center(item) }))
    .sort((left, right) => left.x - right.x);
  const headerY =
    orderedHeaders.reduce((sum, header) => sum + header.item.y, 0) /
    orderedHeaders.length;
  const columns = orderedHeaders.map((header, index) => ({
    field: header.field,
    left:
      index === 0
        ? Number.NEGATIVE_INFINITY
        : (orderedHeaders[index - 1].x + header.x) / 2,
    right:
      index === orderedHeaders.length - 1
        ? Number.POSITIVE_INFINITY
        : (header.x + orderedHeaders[index + 1].x) / 2,
  }));
  const bodyItems = items.filter(
    (item) => item.y < headerY - 2 && item.y > headerY - 140,
  );
  const columnText = new Map<PdfHeaderField, string>();
  for (const column of columns) {
    columnText.set(
      column.field,
      joinedColumnText(
        bodyItems.filter((item) => {
          const itemCenter = center(item);
          return itemCenter >= column.left && itemCenter < column.right;
        }),
      ),
    );
  }

  const values: Partial<Record<ImportableField, string>> = {};
  for (const field of ["position", "name", "purpose", "destination"] as const) {
    const value = columnText.get(field)?.trim();
    if (value) values[field] = value;
  }

  const periodDates = dateValues(columnText.get("period") ?? "");
  if (periodDates.length === 1) {
    values.tripStart = periodDates[0];
    values.tripEnd = periodDates[0];
  } else if (periodDates.length === 2) {
    values.tripStart = periodDates[0];
    values.tripEnd = periodDates[1];
  }

  const applicationDate = items
    .filter((item) => item.y > headerY + 5 && dateValues(item.text).length === 1)
    .sort(
      (left, right) =>
        Math.abs(left.y - headerY) - Math.abs(right.y - headerY) ||
        right.x - left.x,
    )[0];
  if (applicationDate) {
    values.applicationDate = dateValues(applicationDate.text)[0];
  }

  const issues = REQUIRED_FIELDS.filter(
    ([field]) => field !== "tripStart" && field !== "tripEnd" && !values[field],
  ).map(([, label]) => `${label} 직접 입력 필요`);
  if (!values.tripStart && !values.tripEnd) {
    issues.push("출장기간 직접 입력 필요");
  } else {
    if (!values.tripStart) issues.push("출장 시작일 직접 입력 필요");
    if (!values.tripEnd) issues.push("출장 종료일 직접 입력 필요");
  }
  return {
    id: `${source.fileName}:page-${source.page ?? 1}`,
    source,
    status: issues.length ? "needs-review" : "recognized",
    values,
    recognizedFields: importableFields.filter((field) => Boolean(values[field])),
    issues,
    included: true,
  };
}

export function parsePositionedPdfPages(
  pages: PositionedPdfText[][],
  fileName: string,
): TripImportCandidate[] {
  return pages.map((items, index) =>
    parsePdfPageItems(items, {
      fileName,
      fileType: "pdf",
      page: index + 1,
    }),
  );
}

export async function parsePdfBuffer(
  data: ArrayBuffer,
  fileName: string,
): Promise<TripImportCandidate[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  const document = await loadingTask.promise;
  const pages: PositionedPdfText[][] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const positioned: PositionedPdfText[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        positioned.push({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
        });
      }
      pages.push(positioned);
    }
  } finally {
    await loadingTask.destroy();
  }
  return parsePositionedPdfPages(pages, fileName);
}
