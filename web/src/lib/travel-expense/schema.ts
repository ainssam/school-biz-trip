import { z } from "zod";
import {
  defaultTemplateId,
  isTemplateId,
} from "@/lib/templates/template-registry";

export const travelTypes = ["car", "public", "ride", "charter"] as const;
export const travelTypeSchema = z.enum(travelTypes);
export type TravelType = z.infer<typeof travelTypeSchema>;

export const fareSchema = z.union([
  z.number().int().nonnegative(),
  z.literal("미기재"),
]);

export const routeSchema = z.object({
  date: z.iso.date(),
  transport: z.string().trim().min(1).max(12),
  from: z.string().trim().min(1, "출발지를 입력해 주세요.").max(16),
  to: z.string().trim().min(1, "도착지를 입력해 주세요.").max(16),
  grade: z.string().trim().min(1).max(10).default("제2호"),
  fare: fareSchema,
});

export type RouteInput = z.infer<typeof routeSchema>;

const expenseDetailSchema = z.object({
  paid: z.number().int().nonnegative().nullable().default(null),
  actual: z.number().int().nonnegative().nullable().default(null),
  reason: z.string().trim().max(36).default(""),
});

export const attachmentSchema = z.enum([
  "fuel",
  "parking",
  "toll",
  "rail",
  "bus",
  "lodging",
  "other",
]);

export const travelExpenseSchema = z
  .object({
    templateId: z
      .string()
      .refine(isTemplateId, "등록되지 않은 문서 양식입니다.")
      .default(defaultTemplateId),
    school: z.string().trim().min(2).max(20),
    position: z.string().trim().min(1).max(12),
    name: z.string().trim().min(2, "성명을 입력해 주세요.").max(10),
    tripStart: z.iso.date(),
    tripEnd: z.iso.date(),
    applicationDate: z.iso.date(),
    destination: z.string().trim().min(1, "출장지를 입력해 주세요.").max(36),
    purpose: z.string().trim().min(1, "출장목적을 입력해 주세요.").max(60),
    travelType: travelTypeSchema,
    routes: z.array(routeSchema).min(1).max(4),
    lodging: expenseDetailSchema.default({ paid: null, actual: null, reason: "" }),
    meals: expenseDetailSchema.default({ paid: null, actual: null, reason: "" }),
    attachments: z.array(attachmentSchema).max(7).default([]),
    attachmentOther: z.string().trim().max(30).default(""),
  })
  .refine((value) => value.tripEnd >= value.tripStart, {
    path: ["tripEnd"],
    message: "종료일은 시작일보다 빠를 수 없습니다.",
  })
  .superRefine((value, context) => {
    if (
      value.travelType !== "public" &&
      value.routes.some((route) => route.fare !== "미기재")
    ) {
      context.addIssue({
        code: "custom",
        path: ["routes"],
        message: "자가용·차량동승·전세버스 운임은 미기재로 작성합니다.",
      });
    }

    if (
      value.attachments.includes("other") &&
      value.attachmentOther.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["attachmentOther"],
        message: "기타 첨부서류명을 입력해 주세요.",
      });
    }
  });

export type TravelExpenseInput = z.infer<typeof travelExpenseSchema>;
