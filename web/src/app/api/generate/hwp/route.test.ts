import { describe, expect, it } from "vitest";
import { POST } from "./route";

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
});
