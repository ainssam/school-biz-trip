import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { TravelExpenseInput } from "@/lib/travel-expense/schema";
import { generateHwp } from "./generate-hwp";

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
});
