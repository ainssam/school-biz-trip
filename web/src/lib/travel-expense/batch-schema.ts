import { z } from "zod";
import {
  travelExpenseSchema,
  type TravelExpenseInput,
} from "./schema";

const travelExpenseBatchSchema = z
  .array(travelExpenseSchema)
  .min(1, "출장 신청서가 한 건 이상 필요합니다.")
  .max(40, "한 문서에는 출장 신청서를 최대 40건까지 넣을 수 있습니다.")
  .refine(
    (items) =>
      items.length === 0 ||
      items.every((item) => item.templateId === items[0].templateId),
    "한 문서에서는 같은 출력 양식을 사용해 주세요.",
  );

export function parseTravelExpenseBatch(value: unknown): TravelExpenseInput[] {
  return travelExpenseBatchSchema.parse(Array.isArray(value) ? value : [value]);
}
