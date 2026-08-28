import { describe, expect, it } from "vitest";
import { sampleTravelExpense } from "@/test/fixtures/travel-expense";
import { parseTravelExpenseBatch } from "./batch-schema";

describe("여비정산 일괄 요청", () => {
  it("기존 단건 요청을 한 건 배열로 정규화한다", () => {
    expect(parseTravelExpenseBatch(sampleTravelExpense)).toEqual([
      sampleTravelExpense,
    ]);
  });

  it("1건부터 40건까지 허용한다", () => {
    expect(parseTravelExpenseBatch([sampleTravelExpense])).toHaveLength(1);
    expect(
      parseTravelExpenseBatch(Array.from({ length: 40 }, () => sampleTravelExpense)),
    ).toHaveLength(40);
  });

  it("비어 있거나 40건을 넘는 요청을 거부한다", () => {
    expect(() => parseTravelExpenseBatch([])).toThrow();
    expect(() =>
      parseTravelExpenseBatch(
        Array.from({ length: 41 }, () => sampleTravelExpense),
      ),
    ).toThrow();
  });
});
