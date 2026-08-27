import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { sampleTravelExpense } from "@/test/fixtures/travel-expense";
import { generatePdf } from "./generate-pdf";

describe("PDF 생성", () => {
  it(
    "한컴 기준 PDF와 같은 한 페이지 크기로 생성한다",
    async () => {
      const reference = await PDFDocument.load(
        new Uint8Array(
          readFileSync(
            path.join(
              process.cwd(),
              "src/assets/templates/travel-expense-template.pdf",
            ),
          ),
        ),
      );
      const output = await generatePdf(sampleTravelExpense);
      const generated = await PDFDocument.load(output);

      expect(Buffer.from(output).subarray(0, 4).toString()).toBe("%PDF");
      expect(generated.getPageCount()).toBe(1);
      expect(generated.getPage(0).getSize()).toEqual(
        reference.getPage(0).getSize(),
      );
    },
    30_000,
  );
});
