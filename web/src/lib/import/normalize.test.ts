import { describe, expect, it } from "vitest";
import { normalizeDateText, normalizeLabel } from "./normalize";

describe("출장 입력 정규화", () => {
  it("공백이 섞인 출장 라벨을 비교 가능한 문자열로 만든다", () => {
    expect(normalizeLabel("출 장 목 적")).toBe("출장목적");
  });

  it.each([
    ["2026. 8. 27", "2026-08-27"],
    ["2026년 08월 27일", "2026-08-27"],
  ])("날짜 %s를 ISO 날짜로 바꾼다", (source, expected) => {
    expect(normalizeDateText(source)).toBe(expected);
  });

  it("실재하지 않는 날짜는 자동으로 고치지 않는다", () => {
    expect(normalizeDateText("2026.02.31")).toBeNull();
  });
});
