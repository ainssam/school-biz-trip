import { describe, expect, it, vi } from "vitest";
import { POST as postHwp } from "./hwp/route";
import { POST as postPdf } from "./pdf/route";
import { makeSampleTravelExpense } from "@/test/fixtures/travel-expense";

const types = ["car", "public", "ride", "charter"] as const;

describe("문서 생성 API 통합", () => {
  it.each(types)("%s 유형에서 HWP와 PDF를 생성한다", async (travelType) => {
    const input = makeSampleTravelExpense(travelType);
    const makeRequest = (format: "hwp" | "pdf") =>
      new Request(`http://localhost/api/generate/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

    const [hwp, pdf] = await Promise.all([
      postHwp(makeRequest("hwp")),
      postPdf(makeRequest("pdf")),
    ]);

    expect(hwp.status).toBe(200);
    expect(pdf.status).toBe(200);
    expect(hwp.headers.get("cache-control")).toContain("no-store");
    expect(pdf.headers.get("cache-control")).toContain("no-store");
    expect((await hwp.arrayBuffer()).byteLength).toBeGreaterThan(10_000);
    expect((await pdf.arrayBuffer()).byteLength).toBeGreaterThan(10_000);
  }, 30_000);

  it("신청 내용을 콘솔에 기록하지 않는다", async () => {
    const input = {
      ...makeSampleTravelExpense("public"),
      name: "로그금지이름",
      purpose: "로그금지출장목적",
    };
    const consoleSpies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
    ];

    const response = await postPdf(
      new Request("http://localhost/api/generate/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    const logged = consoleSpies.flatMap((spy) => spy.mock.calls).flat().join(" ");
    consoleSpies.forEach((spy) => spy.mockRestore());

    expect(response.status).toBe(200);
    expect(logged).not.toContain(input.name);
    expect(logged).not.toContain(input.purpose);
  }, 30_000);
});
