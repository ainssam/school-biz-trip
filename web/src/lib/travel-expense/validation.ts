import { travelExpenseSchema } from "./schema";

export type DraftValidation = {
  valid: boolean;
  labels: string[];
  messages: Record<string, string>;
};

export function validationLabel(path: PropertyKey[]): string {
  const key = path.join(".");
  const labels: Record<string, string> = {
    school: "소속",
    position: "직급(직위)",
    name: "성명",
    tripStart: "시작일",
    tripEnd: "종료일",
    applicationDate: "작성일",
    destination: "출장지",
    purpose: "출장목적",
    travelType: "출장유형",
    attachmentOther: "기타 첨부서류명",
  };
  if (labels[key]) return labels[key];

  const routeMatch = key.match(/^routes\.(\d+)\.(.+)$/);
  if (routeMatch) {
    const routeNumber = Number(routeMatch[1]) + 1;
    const routeLabels: Record<string, string> = {
      date: "일자",
      transport: "교통편",
      from: "출발지",
      to: "도착지",
      grade: "등급",
      fare: "금액",
    };
    return `경로 ${routeNumber} ${routeLabels[routeMatch[2]] ?? "입력 내용"}`;
  }

  return "입력 내용";
}

export function validateTravelExpenseDraft(value: unknown): DraftValidation {
  const result = travelExpenseSchema.safeParse(value);
  if (result.success) {
    return { valid: true, labels: [], messages: {} };
  }

  const messages: Record<string, string> = {};
  const labels: string[] = [];
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!messages[key]) messages[key] = issue.message;
    const label = validationLabel(issue.path);
    if (!labels.includes(label)) labels.push(label);
  }
  return { valid: false, labels, messages };
}
