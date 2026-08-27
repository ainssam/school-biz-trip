import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const templateDirectory = join(process.cwd(), "src", "assets", "templates");

it("HWP와 PDF 기준 템플릿이 배포 자산에 존재한다", () => {
  const hwp = readFileSync(
    join(templateDirectory, "travel-expense-template.hwp"),
  );
  const pdf = readFileSync(
    join(templateDirectory, "travel-expense-template.pdf"),
  );

  expect(hwp.subarray(0, 8).toString("hex")).toBe("d0cf11e0a1b11ae1");
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
});

it("기본 템플릿은 학교·지역·연도와 생성 자산을 함께 등록한다", () => {
  const registryPath = join(templateDirectory, "registry.json");
  const registry = existsSync(registryPath)
    ? JSON.parse(readFileSync(registryPath, "utf8"))
    : null;

  expect(registry).toMatchObject({
    version: 1,
    defaultTemplateId: "bokja-2026",
    templates: [
      {
        id: "bokja-2026",
        region: "충청남도",
        school: "복자여자고등학교",
        year: 2026,
        files: {
          hwp: "travel-expense-template.hwp",
          pdf: "travel-expense-template.pdf",
          hwpFieldMap: "template-field-map.json",
          pdfFieldMap: "pdf-field-map.json",
        },
      },
    ],
  });
});
