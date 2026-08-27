import { describe, expect, it } from "vitest";
import {
  makeDownloadFilename,
  makeReturnRoute,
  sumFare,
} from "./transform";
import { travelExpenseSchema } from "./schema";

describe("출장 경로 변환", () => {
  it("가는 경로의 출발지와 도착지를 바꿔 돌아오는 경로를 만든다", () => {
    expect(
      makeReturnRoute({
        date: "2026-08-27",
        transport: "철도",
        from: "천안",
        to: "서울",
        grade: "제2호",
        fare: 12000,
      }),
    ).toEqual({
      date: "2026-08-27",
      transport: "철도",
      from: "서울",
      to: "천안",
      grade: "제2호",
      fare: 12000,
    });
  });

  it("숫자 운임만 합산한다", () => {
    expect(
      sumFare([
        { fare: 3500 },
        { fare: "미기재" },
        { fare: 3500 },
      ]),
    ).toBe(7000);
  });

  it("비어 있거나 잘못된 숫자 운임은 합계에서 제외한다", () => {
    expect(sumFare([{ fare: Number.NaN }, { fare: 3500 }])).toBe(3500);
  });

  it("Windows 금지문자를 제거한 파일명을 만든다", () => {
    expect(
      makeDownloadFilename(
        { name: "홍:길동", tripStart: "2026-08-27" },
        "hwp",
      ),
    ).toBe("여비정산신청서_홍길동_2026-08-27.hwp");
  });
});

describe("출장 유형별 입력 검증", () => {
  it("자가용 운임은 숫자 대신 미기재로 작성한다", () => {
    const result = travelExpenseSchema.safeParse({
      school: "가온고등학교",
      position: "교사",
      name: "테스트교사",
      tripStart: "2026-08-27",
      tripEnd: "2026-08-27",
      applicationDate: "2026-08-27",
      destination: "서울",
      purpose: "교육과정 연수 참석",
      travelType: "car",
      routes: [
        {
          date: "2026-08-27",
          transport: "자가용",
          from: "천안",
          to: "서울",
          grade: "제2호",
          fare: 12000,
        },
      ],
      lodging: { paid: null, actual: null, reason: "" },
      meals: { paid: null, actual: null, reason: "" },
      attachments: [],
      attachmentOther: "",
    });

    expect(result.success).toBe(false);
  });
});
