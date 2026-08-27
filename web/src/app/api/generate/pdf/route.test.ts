import { describe, expect, it } from "vitest";
import { sampleTravelExpense } from "@/test/fixtures/travel-expense";
import { POST } from "./route";

describe("PDF 생성 API", () => {
  it("다운로드 헤더와 no-store를 반환한다", async () => {
    const request = new Request("http://localhost/api/generate/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sampleTravelExpense),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(10000);
  }, 30_000);
});
