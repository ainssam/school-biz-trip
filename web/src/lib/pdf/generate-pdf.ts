import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { pdfFieldMap, type PdfField } from "@/assets/templates/pdf-field-map";
import {
  travelExpenseSchema,
  type RouteInput,
  type TravelExpenseInput,
} from "@/lib/travel-expense/schema";

const templatePath = path.join(
  process.cwd(),
  "src/assets/templates/travel-expense-template.pdf",
);

const fontPath = path.join(
  process.cwd(),
  "src/assets/fonts/NanumMyeongjo-Regular.ttf",
);

const attachmentLabels = {
  fuel: "주유영수증",
  parking: "주차영수증",
  toll: "하이패스 영수증",
  rail: "철도승차권(영수증)",
  bus: "버스 승차권(영수증)",
  lodging: "숙박 영수증",
  other: "",
} as const;

export class DocumentValueTooLongError extends Error {}

function formatDate(value: string, padded = false): string {
  const [year, month, day] = value.split("-").map(Number);
  return padded
    ? `${year}년 ${String(month).padStart(2, "0")}월 ${String(day).padStart(2, "0")}일`
    : `${year}년 ${month}월 ${day}일`;
}

function formatRouteDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${month}/${day}`;
}

function formatMoney(value: number | null): string {
  return value === null ? "" : value.toLocaleString("ko-KR");
}

function formatFare(value: RouteInput["fare"]): string {
  return typeof value === "number" ? value.toLocaleString("ko-KR") : value;
}

function formatAttachments(input: TravelExpenseInput): string {
  const values: string[] = input.attachments
    .filter((attachment) => attachment !== "other")
    .map((attachment) => attachmentLabels[attachment]);
  if (input.attachments.includes("other") && input.attachmentOther) {
    values.push(input.attachmentOther);
  }
  return values.join(", ");
}

function drawValue(
  page: PDFPage,
  font: PDFFont,
  field: PdfField,
  rawText: string,
): void {
  const text = rawText.replace(/[\r\n]+/g, " ").trim();
  if (!text) return;

  const textWidth = font.widthOfTextAtSize(text, field.fontSize);
  const padding = field.align === "left" ? 3 : 1;
  if (textWidth > field.width - padding * 2) {
    throw new DocumentValueTooLongError(`PDF 필드 너비 초과: ${text.length}자`);
  }

  const x =
    field.align === "center"
      ? field.x + (field.width - textWidth) / 2
      : field.align === "right"
        ? field.x + field.width - textWidth - padding
        : field.x + padding;

  page.drawText(text, {
    x,
    y: field.y,
    size: field.fontSize,
    font,
    color: rgb(0, 0, 0),
  });
}

export async function generatePdf(
  input: TravelExpenseInput,
): Promise<Uint8Array> {
  const parsed = travelExpenseSchema.parse(input);
  const [templateBytes, fontBytes] = await Promise.all([
    readFile(templatePath),
    readFile(fontPath),
  ]);
  const document = await PDFDocument.load(new Uint8Array(templateBytes));
  document.registerFontkit(fontkit);
  const font = await document.embedFont(new Uint8Array(fontBytes), {
    subset: false,
  });
  const page = document.getPage(0);

  drawValue(page, font, pdfFieldMap.school, parsed.school);
  drawValue(page, font, pdfFieldMap.position, parsed.position);
  drawValue(page, font, pdfFieldMap.name, parsed.name);
  drawValue(
    page,
    font,
    pdfFieldMap.schedule,
    `${formatDate(parsed.tripStart, true)} ～ ${formatDate(parsed.tripEnd, true)}`,
  );
  drawValue(page, font, pdfFieldMap.destination, parsed.destination);
  drawValue(page, font, pdfFieldMap.purpose, parsed.purpose);
  drawValue(page, font, pdfFieldMap.lodgingPaid, formatMoney(parsed.lodging.paid));
  drawValue(page, font, pdfFieldMap.lodgingActual, formatMoney(parsed.lodging.actual));
  drawValue(page, font, pdfFieldMap.lodgingReason, parsed.lodging.reason);
  drawValue(page, font, pdfFieldMap.mealsPaid, formatMoney(parsed.meals.paid));
  drawValue(page, font, pdfFieldMap.mealsActual, formatMoney(parsed.meals.actual));
  drawValue(page, font, pdfFieldMap.mealsReason, parsed.meals.reason);

  for (let index = 0; index < pdfFieldMap.routes.length; index += 1) {
    const field = pdfFieldMap.routes[index];
    const route = parsed.routes[index];
    if (!route) continue;
    drawValue(page, font, field.date, formatRouteDate(route.date));
    drawValue(page, font, field.transport, route.transport);
    drawValue(page, font, field.from, route.from);
    drawValue(page, font, field.to, route.to);
    drawValue(page, font, field.grade, route.grade);
    drawValue(page, font, field.fare, formatFare(route.fare));
  }

  drawValue(
    page,
    font,
    pdfFieldMap.attachments,
    `첨 부 : ${formatAttachments(parsed)}`.trimEnd(),
  );
  drawValue(
    page,
    font,
    pdfFieldMap.applicationDate,
    formatDate(parsed.applicationDate),
  );
  drawValue(
    page,
    font,
    pdfFieldMap.signature,
    `신 청 인      성 명      ${parsed.name} (인)`,
  );

  return document.save({ useObjectStreams: false });
}
