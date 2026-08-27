import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PdfField } from "@/assets/templates/pdf-field-map";
import { getTemplateById } from "@/lib/templates/template-registry";

type HwpTarget = {
  row: number;
  col: number;
  cellParagraph?: number;
};

export type HwpFieldMap = {
  table: {
    section: number;
    paragraph: number;
    control: number;
  };
  fields: Record<string, HwpTarget>;
  routes: Array<{
    row: number;
    date: number;
    transport: number;
    from: number;
    to: number;
    grade: number;
    fare: number;
  }>;
};

export type PdfFieldMap = {
  school: PdfField;
  position: PdfField;
  name: PdfField;
  schedule: PdfField;
  destination: PdfField;
  purpose: PdfField;
  lodgingPaid: PdfField;
  lodgingActual: PdfField;
  lodgingReason: PdfField;
  mealsPaid: PdfField;
  mealsActual: PdfField;
  mealsReason: PdfField;
  routes: Array<{
    date: PdfField;
    transport: PdfField;
    from: PdfField;
    to: PdfField;
    grade: PdfField;
    fare: PdfField;
  }>;
  attachments: PdfField;
  applicationDate: PdfField;
  signature: PdfField;
};

const templateDirectory = path.resolve(
  process.cwd(),
  "src/assets/templates",
);

function resolveTemplateFile(relativePath: string): string {
  const resolved = path.resolve(templateDirectory, relativePath);
  if (
    resolved !== templateDirectory &&
    !resolved.startsWith(`${templateDirectory}${path.sep}`)
  ) {
    throw new Error(`템플릿 경로가 허용 범위를 벗어났습니다: ${relativePath}`);
  }
  return resolved;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export async function loadTemplateAssets(templateId: string) {
  const template = getTemplateById(templateId);
  const hwpPath = resolveTemplateFile(template.files.hwp);
  const pdfPath = resolveTemplateFile(template.files.pdf);
  const [hwpFieldMap, pdfFieldMap] = await Promise.all([
    readJson<HwpFieldMap>(resolveTemplateFile(template.files.hwpFieldMap)),
    readJson<PdfFieldMap>(resolveTemplateFile(template.files.pdfFieldMap)),
  ]);

  return {
    template,
    hwpPath,
    pdfPath,
    hwpFieldMap,
    pdfFieldMap,
  };
}
