import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TripImportCandidate } from "@/lib/import/types";
import { ImportPanel } from "./ImportPanel";

const candidates: TripImportCandidate[] = [
  {
    id: "first",
    source: {
      fileName: "synthetic.xlsx",
      fileType: "xlsx",
      sheetName: "첫째",
    },
    status: "needs-review",
    values: { name: "가상교사A" },
    recognizedFields: ["name"],
    issues: ["출장지 직접 입력 필요"],
    included: true,
  },
  {
    id: "second",
    source: { fileName: "synthetic.pdf", fileType: "pdf", page: 1 },
    status: "needs-review",
    values: { name: "가상교사B" },
    recognizedFields: ["name"],
    issues: ["출장지 직접 입력 필요"],
    included: true,
  },
];

vi.mock("@/lib/import/read-files.client", () => ({
  readTripFiles: vi.fn(async () => candidates),
}));

function Harness() {
  const [count, setCount] = useState(0);
  return (
    <>
      <ImportPanel onCandidates={(next) => setCount(next.length)} />
      <output aria-label="인식 결과 수">{count}</output>
    </>
  );
}

describe("출장 신청서 불러오기", () => {
  it("여러 파일을 분석하고 인식한 출장 건 수를 알린다", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.upload(screen.getByLabelText("출장 신청서 파일"), [
      new File(["xlsx"], "synthetic.xlsx"),
      new File(["pdf"], "synthetic.pdf"),
    ]);

    expect(
      await screen.findByText("출장 2건을 인식했습니다."),
    ).toBeVisible();
    expect(screen.getByLabelText("인식 결과 수")).toHaveTextContent("2");
    expect(screen.getByText(/원본 파일은 브라우저 안에서만/)).toBeVisible();
  });
});
