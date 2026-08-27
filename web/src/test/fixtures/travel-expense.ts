import type {
  TravelExpenseInput,
  TravelType,
} from "@/lib/travel-expense/schema";

export const sampleTravelExpense: TravelExpenseInput = {
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

export function makeSampleTravelExpense(
  travelType: TravelType,
): TravelExpenseInput {
  const transport = {
    public: "철도",
    car: "자가용",
    ride: "차량동승",
    charter: "전세버스",
  }[travelType];

  return {
    ...sampleTravelExpense,
    travelType,
    routes: sampleTravelExpense.routes.map((route) => ({
      ...route,
      transport,
      fare: travelType === "public" ? route.fare : "미기재",
    })),
    attachments:
      travelType === "public" ? ["rail"] : travelType === "car" ? ["fuel"] : [],
  };
}
