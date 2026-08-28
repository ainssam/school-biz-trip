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

  it("출력에 포함한 여러 출장 건을 배열 요청으로 보낸다", async () => {
    const complete = (id: string, name: string): TripImportCandidate => ({
      ...candidate(id, name, "합성 연수"),
      values: {
        school: "복자여자고등학교",
        position: "교사",
        name,
        applicationDate: "2026-08-26",
        tripStart: "2026-08-27",
        tripEnd: "2026-08-27",
        purpose: "합성 연수",
        destination: "가상기관",
      },
      recognizedFields: [
        "school",
        "position",
        "name",
        "applicationDate",
        "tripStart",
        "tripEnd",
        "purpose",
        "destination",
      ],
      issues: [],
      status: "recognized",
    });
    vi.mocked(readTripFiles).mockResolvedValueOnce([
      complete("first", "가상교사A"),
      complete("second", "가상교사B"),
    ]);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ExpenseForm />);
    await user.upload(
      screen.getByLabelText("출장 신청서 파일"),
      new File(["xlsx"], "synthetic.xlsx"),
    );

    for (const index of [1, 2]) {
      if (index === 2) {
        await user.click(screen.getByRole("button", { name: /출장 건 2/ }));
      }
      await user.selectOptions(screen.getByLabelText("출장유형"), "public");
      await user.selectOptions(screen.getByLabelText("등급 1"), "제2호");
      await user.type(screen.getByLabelText("출발지 1"), "가상출발");
      await user.type(screen.getByLabelText("도착지 1"), "가상도착");
    }
    await user.click(
      screen.getByRole("checkbox", { name: "입력 내용을 확인했습니다." }),
    );
    await user.click(screen.getByRole("button", { name: "PDF 내려받기" }));

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toHaveLength(2);
    vi.unstubAllGlobals();
  });
});
