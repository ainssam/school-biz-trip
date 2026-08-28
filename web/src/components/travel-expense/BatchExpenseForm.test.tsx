import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TripImportCandidate } from "@/lib/import/types";
import { readTripFiles } from "@/lib/import/read-files.client";
import { ExpenseForm } from "./ExpenseForm";

vi.mock("@/lib/import/read-files.client", () => ({
  readTripFiles: vi.fn(),
}));

function candidate(
  id: string,
  name: string,
  purpose = "",
): TripImportCandidate {
  return {
    id,
    source: {
      fileName: "synthetic.xlsx",
      fileType: "xlsx",
      sheetName: id,
    },
    status: "needs-review",
    values: {
      name,
      purpose,
      tripStart: "2026-08-27",
      tripEnd: "2026-08-27",
    },
    recognizedFields: ["name", "purpose", "tripStart", "tripEnd"],
    issues: ["출장지 직접 입력 필요"],
    included: true,
  };
}

describe("불러온 출장 건 편집", () => {
  beforeEach(() => vi.mocked(readTripFiles).mockReset());

  it("인식하지 못한 출장지는 빈칸과 직접 입력 안내로 남긴다", async () => {
    vi.mocked(readTripFiles).mockResolvedValueOnce([
      candidate("first", "가상교사", "합성 연수"),
    ]);
    const user = userEvent.setup();
    render(<ExpenseForm />);

    await user.upload(
      screen.getByLabelText("출장 신청서 파일"),
      new File(["xlsx"], "synthetic.xlsx"),
    );

    expect(await screen.findByDisplayValue("가상교사")).toBeVisible();
    expect(screen.getByLabelText("출장지 *")).toHaveValue("");
    expect(screen.getByText("출장지 직접 입력 필요")).toBeVisible();
  });

  it("다른 출장 건을 보고 돌아와도 사용자가 수정한 값을 보존한다", async () => {
    vi.mocked(readTripFiles).mockResolvedValueOnce([
      candidate("first", "가상교사A", "첫 목적"),
      candidate("second", "가상교사B", "둘째 목적"),
    ]);
    const user = userEvent.setup();
    render(<ExpenseForm />);
    await user.upload(
      screen.getByLabelText("출장 신청서 파일"),
      new File(["xlsx"], "synthetic.xlsx"),
    );
    const purpose = screen.getByLabelText("출장목적 *");
    await user.clear(purpose);
    await user.type(purpose, "사용자가 수정한 목적");

    await user.click(screen.getByRole("button", { name: /출장 건 2/ }));
    expect(screen.getByLabelText("출장목적 *")).toHaveValue("둘째 목적");
    await user.click(screen.getByRole("button", { name: /출장 건 1/ }));

    expect(screen.getByLabelText("출장목적 *")).toHaveValue(
      "사용자가 수정한 목적",
    );
  });
});
