import type { TripImportCandidate } from "@/lib/import/types";
import type {
  TravelExpenseInput,
  TravelType,
} from "@/lib/travel-expense/schema";

export type DraftRouteInput = {
  date: string;
  transport: string;
  from: string;
  to: string;
  grade: string;
  fare: number | "미기재" | null;
};

export type TravelExpenseDraftInput = Omit<
  TravelExpenseInput,
  "travelType" | "routes"
> & {
  travelType: TravelType | "";
  routes: DraftRouteInput[];
};

export function candidateToDraft(
  candidate: TripImportCandidate,
  templateId: string,
): TravelExpenseDraftInput {
  const values = candidate.values;
  return {
    templateId,
    school: values.school ?? "",
    position: values.position ?? "",
    name: values.name ?? "",
    tripStart: values.tripStart ?? "",
    tripEnd: values.tripEnd ?? "",
    applicationDate: values.applicationDate ?? "",
    destination: values.destination ?? "",
    purpose: values.purpose ?? "",
    travelType: "",
    routes: [
      {
        date: values.tripStart ?? "",
        transport: "",
        from: "",
        to: "",
        grade: "",
        fare: null,
      },
    ],
    lodging: { paid: null, actual: null, reason: "" },
    meals: { paid: null, actual: null, reason: "" },
    attachments: [],
    attachmentOther: "",
  };
}
