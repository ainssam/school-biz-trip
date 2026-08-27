import { readFileSync } from "node:fs";
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
