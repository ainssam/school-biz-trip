import { ZodError } from "zod";
import {
  DocumentValueTooLongError,
  generatePdfBatch,
} from "@/lib/pdf/generate-pdf";
import { parseTravelExpenseBatch } from "@/lib/travel-expense/batch-schema";
import {
  makeBatchDownloadFilename,
  makeDownloadFilename,
} from "@/lib/travel-expense/transform";

export const runtime = "nodejs";

function downloadDisposition(filename: string): string {
  return `attachment; filename="travel-expense.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const inputs = parseTravelExpenseBatch(body);
    const bytes = await generatePdfBatch(inputs);
    const filename = Array.isArray(body)
      ? makeBatchDownloadFilename(inputs.length, "pdf")
      : makeDownloadFilename(inputs[0], "pdf");

    return new Response(Buffer.from(bytes), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": downloadDisposition(filename),
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    if (
      error instanceof ZodError ||
      error instanceof SyntaxError ||
      error instanceof DocumentValueTooLongError
    ) {
      return Response.json(
        { error: "입력 내용을 확인해 주세요." },
        {
          status: 400,
          headers: { "Cache-Control": "private, no-store, max-age=0" },
        },
      );
    }

    return Response.json(
      { error: "PDF 파일을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }
}
