import { ZodError } from "zod";
import {
  DocumentValueTooLongError,
  generatePdf,
} from "@/lib/pdf/generate-pdf";
import { travelExpenseSchema } from "@/lib/travel-expense/schema";
import { makeDownloadFilename } from "@/lib/travel-expense/transform";

export const runtime = "nodejs";

function downloadDisposition(filename: string): string {
  return `attachment; filename="travel-expense.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const input = travelExpenseSchema.parse(await request.json());
    const bytes = await generatePdf(input);
    const filename = makeDownloadFilename(input, "pdf");

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
