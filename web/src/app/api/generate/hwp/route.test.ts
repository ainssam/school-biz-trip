import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { sampleTravelExpense } from "@/test/fixtures/travel-expense";

describe("HWP 생성 API", () => {
  it("다운로드 헤더와 no-store를 반환한다", async () => {
    const request = new Request("http://localhost/api/generate/hwp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-type")).toBe("application/x-hwp");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(10000);
  });

  it("여러 출장 건을 한 HWP의 여러 섹션으로 반환한다", async () => {
    const request = new Request("http://localhost/api/generate/hwp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { ...sampleTravelExpense, name: "가상A" },
        { ...sampleTravelExpense, name: "가상B" },
      ]),
    });

    const response = await POST(request);
    const output = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(output.subarray(0, 8).toString("hex")).toBe(
      "d0cf11e0a1b11ae1",
    );
    expect(response.headers.get("content-disposition")).toContain(
      encodeURIComponent("여비정산신청서_일괄_2건.hwp"),
    );
  }, 30_000);

  it("41건 일괄 요청을 파일 생성 전에 거부한다", async () => {
    const request = new Request("http://localhost/api/generate/hwp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Array.from({ length: 41 }, () => sampleTravelExpense),
      ),
    });

    expect((await POST(request)).status).toBe(400);
  });
});
