import { ZodError } from "zod";
import { generateHwpBatch } from "@/lib/hwp/generate-hwp";
import { parseTravelExpenseBatch } from "@/lib/travel-expense/batch-schema";
import {
  makeBatchDownloadFilename,
  makeDownloadFilename,
} from "@/lib/travel-expense/transform";

export const runtime = "nodejs";

function downloadDisposition(filename: string): string {
  return `attachment; filename="travel-expense.hwp"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const inputs = parseTravelExpenseBatch(body);
    const bytes = await generateHwpBatch(inputs);
    const filename = Array.isArray(body)
      ? makeBatchDownloadFilename(inputs.length, "hwp")
      : makeDownloadFilename(inputs[0], "hwp");

    return new Response(Buffer.from(bytes), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": downloadDisposition(filename),
        "Content-Type": "application/x-hwp",
      },
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return Response.json(
        { error: "입력 내용을 확인해 주세요." },
        {
          status: 400,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        },
      );
    }

    return Response.json(
      { error: "HWP 파일을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }
}
