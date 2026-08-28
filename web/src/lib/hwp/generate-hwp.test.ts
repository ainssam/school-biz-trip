import { readFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { TravelExpenseInput } from "@/lib/travel-expense/schema";
import { generateHwp, generateHwpBatch } from "./generate-hwp";

const templatePath = path.join(
  process.cwd(),
  "src/assets/templates/travel-expense-template.hwp",
);

const validInput: TravelExpenseInput = {
  templateId: "bokja-2026",
  school: "가온고등학교",
  position: "교사",
  name: "테스트",
  tripStart: "2026-08-27",
  tripEnd: "2026-08-27",
  applicationDate: "2026-08-28",
  destination: "서울 교육연수원",
  purpose: "교육과정 담당자 연수 참석",
  travelType: "public",
  routes: [
    {
      date: "2026-08-27",
      transport: "철도",
      from: "천안",
      to: "서울",
      grade: "제2호",
      fare: 12000,
    },
  ],
  lodging: { paid: null, actual: null, reason: "" },
  meals: { paid: null, actual: null, reason: "" },
  attachments: ["rail"],
  attachmentOther: "",
};

describe("HWP 생성", () => {
  it("원본 템플릿을 바꾸지 않고 HWP를 생성한다", async () => {
    const before = readFileSync(templatePath);
    const output = await generateHwp(validInput);

    expect(Buffer.from(output).subarray(0, 8).toString("hex")).toBe(
      "d0cf11e0a1b11ae1",
    );
    expect(readFileSync(templatePath)).toEqual(before);
  });

  it("출장 건마다 독립 섹션에 해당 값만 기록한다", async () => {
    const output = await generateHwpBatch([
      { ...validInput, name: "가상A", purpose: "첫째 합성 연수" },
      { ...validInput, name: "가상B", purpose: "둘째 합성 회의" },
    ]);
    const CFB = (await import(
      "../../../vendor/claw-hwp/vendor/cfb/cfb.js"
    )) as unknown as {
      parse(data: Uint8Array): unknown;
      find(
        cfb: unknown,
        streamPath: string,
      ): { content: Uint8Array } | null;
    };
    const cfb = CFB.parse(Buffer.from(output));
    const first = CFB.find(cfb, "Root Entry/BodyText/Section0");
    const second = CFB.find(cfb, "Root Entry/BodyText/Section1");
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    if (!first || !second) {
      throw new Error("생성된 HWP 섹션을 찾지 못했습니다.");
    }
    const firstText = Buffer.from(
      inflateRawSync(Buffer.from(first.content)),
    ).toString("utf16le");
    const secondText = Buffer.from(
      inflateRawSync(Buffer.from(second.content)),
    ).toString("utf16le");

    expect(firstText).toContain("가상A");
    expect(firstText).toContain("첫째 합성 연수");
    expect(firstText).not.toContain("가상B");
    expect(secondText).toContain("가상B");
    expect(secondText).toContain("둘째 합성 회의");
    expect(secondText).not.toContain("가상A");
  }, 30_000);
});
