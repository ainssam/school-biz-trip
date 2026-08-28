import {
  copyFile,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const templatePath = path.join(
  process.cwd(),
  "src/assets/templates/travel-expense-template.hwp",
);

function recordDataOffset(raw: Buffer, wantedTag: number): number {
  let offset = 0;
  while (offset + 4 <= raw.length) {
    const header = raw.readUInt32LE(offset);
    const tag = header & 0x3ff;
    let size = (header >>> 20) & 0xfff;
    offset += 4;
    if (size === 0xfff) {
      size = raw.readUInt32LE(offset);
      offset += 4;
    }
    if (tag === wantedTag) return offset;
    offset += size;
  }
  throw new Error(`HWP 레코드 ${wantedTag}를 찾지 못했습니다.`);
}

describe("HWP 템플릿 섹션 복제", () => {
  it("원본을 보존하고 요청한 섹션 수와 DocInfo 수를 함께 맞춘다", async () => {
    const tempDirectory = await mkdtemp(
      path.join(tmpdir(), "travel-expense-section-test-"),
    );
    const outputPath = path.join(tempDirectory, "batch.hwp");
    const before = await readFile(templatePath);
    try {
      await copyFile(templatePath, outputPath);
      const patcher = (await import(
        "../../../vendor/claw-hwp/cell-patch.mjs"
      )) as {
        duplicateSectionsInPlace: (
          filePath: string,
          count: number,
        ) => Promise<{ sectionCount: number }>;
      };

      await patcher.duplicateSectionsInPlace(outputPath, 3);

      const CFB = (await import(
        "../../../vendor/claw-hwp/vendor/cfb/cfb.js"
      )) as unknown as {
        parse(data: Uint8Array): unknown;
        find(
          cfb: unknown,
          streamPath: string,
        ): { content: Uint8Array } | null;
      };
      const cfb = CFB.parse(await readFile(outputPath));
      expect(CFB.find(cfb, "Root Entry/BodyText/Section0")).toBeTruthy();
      expect(CFB.find(cfb, "Root Entry/BodyText/Section1")).toBeTruthy();
      expect(CFB.find(cfb, "Root Entry/BodyText/Section2")).toBeTruthy();
      expect(CFB.find(cfb, "Root Entry/BodyText/Section3")).toBeNull();
      const docInfo = CFB.find(cfb, "Root Entry/DocInfo");
      expect(docInfo).toBeTruthy();
      if (!docInfo) throw new Error("DocInfo 스트림을 찾지 못했습니다.");
      const rawDocInfo = Buffer.from(
        inflateRawSync(Buffer.from(docInfo.content)),
      );
      expect(rawDocInfo.readUInt16LE(recordDataOffset(rawDocInfo, 0x10))).toBe(
        3,
      );
      expect(await readFile(templatePath)).toEqual(before);
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }, 30_000);
});
