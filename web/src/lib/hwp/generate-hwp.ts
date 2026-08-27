import "server-only";

import {
  copyFile,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fieldMap from "@/assets/templates/template-field-map.json";
import {
  travelExpenseSchema,
  type RouteInput,
  type TravelExpenseInput,
} from "@/lib/travel-expense/schema";

type CellEdit = {
  section: number;
  para: number;
  control: number;
  row: number;
  col: number;
  text: string;
  cell_para?: number;
  clear_objects?: boolean;
};

type PatchModule = {
  patchCellsInPlace: (
    filePath: string,
    edits: CellEdit[],
  ) => Promise<unknown>;
};

const templatePath = path.join(
  process.cwd(),
  "src/assets/templates/travel-expense-template.hwp",
);

const runtimePath = path.join(
  process.cwd(),
  "vendor/claw-hwp/cell-patch.mjs",
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

function formatDate(value: string, padded = false): string {
  const [year, month, day] = value.split("-").map(Number);
  if (padded) {
    return `${year}년 ${String(month).padStart(2, "0")}월 ${String(day).padStart(2, "0")}일`;
  }
  return `${year}년 ${month}월 ${day}일`;
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

function buildCellEdits(input: TravelExpenseInput): CellEdit[] {
  const table = fieldMap.table;
  const base = {
    section: table.section,
    para: table.paragraph,
    control: table.control,
  };
  const fields = fieldMap.fields;
  const edits: CellEdit[] = [];
  const add = (
    target: { row: number; col: number; cellParagraph?: number },
    text: string,
  ) => {
    edits.push({
      ...base,
      row: target.row,
      col: target.col,
      text,
      ...(target.cellParagraph === undefined
        ? {}
        : { cell_para: target.cellParagraph }),
    });
  };

  add(fields.school, input.school);
  add(fields.position, input.position);
  add(fields.name, input.name);
  add(
    fields.schedule,
    `${formatDate(input.tripStart, true)} ～ ${formatDate(input.tripEnd, true)}`,
  );
  add(fields.destination, input.destination);
  add(fields.purpose, input.purpose);
  add(fields.lodgingPaid, formatMoney(input.lodging.paid));
  add(fields.lodgingActual, formatMoney(input.lodging.actual));
  add(fields.lodgingReason, input.lodging.reason);
  add(fields.mealsPaid, formatMoney(input.meals.paid));
  add(fields.mealsActual, formatMoney(input.meals.actual));
  add(fields.mealsReason, input.meals.reason);

  for (let index = 0; index < fieldMap.routes.length; index += 1) {
    const target = fieldMap.routes[index];
    const route = input.routes[index];
    const values = route
      ? {
          date: formatRouteDate(route.date),
          transport: route.transport,
          from: route.from,
          to: route.to,
          grade: route.grade,
          fare: formatFare(route.fare),
        }
      : { date: "", transport: "", from: "", to: "", grade: "", fare: "" };

    add({ row: target.row, col: target.date }, values.date);
    add({ row: target.row, col: target.transport }, values.transport);
    add({ row: target.row, col: target.from }, values.from);
    add({ row: target.row, col: target.to }, values.to);
    add({ row: target.row, col: target.grade }, values.grade);
    add({ row: target.row, col: target.fare }, values.fare);
  }

  add(fields.attachments, `첨 부 : ${formatAttachments(input)}`.trimEnd());
  add(fields.applicationDate, formatDate(input.applicationDate));
  add(fields.signature, `신 청 인      성 명      ${input.name} (인)`);

  return edits;
}

async function loadPatcher(): Promise<PatchModule> {
  if (process.env.VITEST) {
    return (await import(pathToFileURL(runtimePath).href)) as PatchModule;
  }
  const importAtRuntime = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<PatchModule>;
  return importAtRuntime(pathToFileURL(runtimePath).href);
}

export async function generateHwp(
  input: TravelExpenseInput,
): Promise<Uint8Array> {
  const parsed = travelExpenseSchema.parse(input);
  const tempDirectory = await mkdtemp(
    path.join(tmpdir(), "travel-expense-hwp-"),
  );
  const outputPath = path.join(tempDirectory, "result.hwp");

  try {
    await copyFile(templatePath, outputPath);
    const { patchCellsInPlace } = await loadPatcher();
    await patchCellsInPlace(outputPath, buildCellEdits(parsed));
    return new Uint8Array(await readFile(outputPath));
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
