import { describe, expect, it } from "vitest";
import type { TripImportCandidate } from "@/lib/import/types";
import { candidateToDraft } from "./draft";

const candidate: TripImportCandidate = {
  id: "synthetic-1",
  source: {
    fileName: "synthetic.xlsx",
    fileType: "xlsx",
    sheetName: "신청서",
  },
  status: "needs-review",
  values: {
    name: "가상교사",
    tripStart: "2026-08-27",
    tripEnd: "2026-08-27",
  },
  recognizedFields: ["name", "tripStart", "tripEnd"],
  issues: ["출장지 직접 입력 필요"],
  included: true,
};

describe("인식 결과 편집 초안", () => {
  it("원본에 없는 출장 필드는 빈 상태로 둔다", () => {
    const draft = candidateToDraft(candidate, "bokja-2026");

    expect(draft.destination).toBe("");
    expect(draft.purpose).toBe("");
    expect(draft.school).toBe("");
    expect(draft.position).toBe("");
    expect(draft.travelType).toBe("");
    expect(draft.routes[0]).toMatchObject({
      date: "2026-08-27",
      transport: "",
      from: "",
      to: "",
      grade: "",
      fare: null,
    });
  });

  it("원본에서 확인한 필드만 같은 값으로 연결한다", () => {
    const draft = candidateToDraft(
      {
        ...candidate,
        values: {
          school: "가상고등학교",
          position: "교사",
          name: "가상교사",
          applicationDate: "2026-08-26",
          tripStart: "2026-08-27",
          tripEnd: "2026-08-28",
          purpose: "합성 연수",
          destination: "가상기관",
        },
      },
      "bokja-2026",
    );

    expect(draft).toMatchObject({
      school: "가상고등학교",
      position: "교사",
      name: "가상교사",
      applicationDate: "2026-08-26",
      tripStart: "2026-08-27",
      tripEnd: "2026-08-28",
      purpose: "합성 연수",
      destination: "가상기관",
    });
  });
});
