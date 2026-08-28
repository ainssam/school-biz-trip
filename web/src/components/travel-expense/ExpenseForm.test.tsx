import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExpenseForm } from "./ExpenseForm";

describe("여비정산 입력", () => {
  it("지역·학교·연도로 사용할 문서 템플릿을 선택한다", () => {
    render(<ExpenseForm />);

    expect(
      screen.getByRole("combobox", { name: "사용 양식" }),
    ).toHaveValue("bokja-2026");
    expect(
      screen.getByRole("option", {
        name: "충청남도 · 복자여자고등학교 · 2026",
      }),
    ).toBeVisible();
  });

  it("출장유형을 자가용으로 고르면 교통편과 운임을 자동으로 바꾼다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);

    await user.selectOptions(screen.getByLabelText("출장유형"), "car");

    expect(screen.getByLabelText("교통편 1")).toHaveValue("자가용");
    expect(screen.getByLabelText("금액 1")).toHaveValue("");
    expect(
      within(screen.getByLabelText("입력내용 미리보기")).queryByText("미기재"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("자가용: 운임 금액 없음")).toBeVisible();
  });

  it("가는 길의 출발지와 도착지를 바꿔 돌아오는 길을 추가한다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);

    await user.type(screen.getByLabelText("출발지 1"), "천안");
    await user.type(screen.getByLabelText("도착지 1"), "서울");
    await user.click(
      screen.getByRole("button", { name: "돌아오는 경로 자동 추가" }),
    );

    expect(screen.getByLabelText("출발지 2")).toHaveValue("서울");
    expect(screen.getByLabelText("도착지 2")).toHaveValue("천안");
  });

  it("가는 경로는 시작일, 돌아오는 경로는 종료일과 자동으로 맞춘다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);

    await user.clear(screen.getByLabelText("시작일 *"));
    await user.type(screen.getByLabelText("시작일 *"), "2026-09-01");
    await user.clear(screen.getByLabelText("종료일 *"));
    await user.type(screen.getByLabelText("종료일 *"), "2026-09-03");
    await user.click(
      screen.getByRole("button", { name: "돌아오는 경로 자동 추가" }),
    );

    expect(screen.getByLabelText("일자 1")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("일자 2")).toHaveValue("2026-09-03");
    expect(screen.getByLabelText("교통편 2")).toHaveValue("철도");
  });

  it("내려받기 전에 빠진 필수 입력을 구체적으로 알려준다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);

    await user.click(
      screen.getByRole("checkbox", { name: "입력 내용을 확인했습니다." }),
    );
    await user.click(screen.getByRole("button", { name: "HWP 내려받기" }));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("성명");
    expect(status).toHaveTextContent("출장지");
    expect(status).toHaveTextContent("출장목적");
    expect(status).toHaveTextContent("경로 1 출발지");
    expect(status).toHaveTextContent("경로 1 도착지");
    expect(screen.getByText("출발지를 입력해 주세요.")).toBeVisible();
    expect(screen.getByText("도착지를 입력해 주세요.")).toBeVisible();
  });

  it("입력한 직급, 이동 경로, 첨부서류를 미리보기에 모두 반영한다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);

    await user.type(screen.getByLabelText("출발지 1"), "천안");
    await user.type(screen.getByLabelText("도착지 1"), "서울");
    await user.click(screen.getByRole("checkbox", { name: "철도승차권(영수증)" }));

    const preview = within(screen.getByLabelText("입력내용 미리보기"));
    expect(preview.getByText("교사")).toBeVisible();
    expect(preview.getByText("천안 → 서울")).toBeVisible();
    expect(preview.getByText("철도승차권(영수증)")).toBeVisible();
  });

  it("확인 체크 전에는 내려받기를 막고 입력이 바뀌면 다시 확인을 요구한다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);

    const hwpButton = screen.getByRole("button", { name: "HWP 내려받기" });
    expect(hwpButton).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", { name: "입력 내용을 확인했습니다." }),
    );
    expect(hwpButton).toBeEnabled();

    await user.type(screen.getByPlaceholderText("신청인 성명"), "홍길동");
    await waitFor(() => expect(hwpButton).toBeDisabled());
  });

  it("HWP 요청에 선택한 템플릿 ID를 포함한다", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ExpenseForm />);

    await user.type(screen.getByPlaceholderText("신청인 성명"), "홍길동");
    await user.type(screen.getByLabelText("출발지 1"), "천안");
    await user.type(screen.getByLabelText("도착지 1"), "서울");
    await user.type(screen.getByLabelText("출장지 *"), "서울");
    await user.type(screen.getByLabelText("출장목적 *"), "연수");
    await user.click(
      screen.getByRole("checkbox", { name: "입력 내용을 확인했습니다." }),
    );
    await user.click(screen.getByRole("button", { name: "HWP 내려받기" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      templateId: "bokja-2026",
    });
    vi.unstubAllGlobals();
  });

  it("숙박비와 식비를 입력하지 않으면 정산 없음으로 점검한다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);
    await user.selectOptions(screen.getByLabelText("출장유형"), "ride");

    const preview = within(screen.getByLabelText("입력내용 미리보기"));
    expect(preview.getByText("숙박비").parentElement).toHaveTextContent("숙박비—");
    expect(preview.getByText("식비").parentElement).toHaveTextContent("식비—");
  });

  it("작성요령에서 제출기한과 숙박비 기준을 확인한다", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ExpenseForm />);
    expect(screen.getByRole("button", { name: "HWP 내려받기" })).toBeVisible();

    const { GuideView } = await import("./GuideView");
    rerender(<GuideView />);
    expect(screen.getByText(/출장 후 반드시 7일 이내/)).toBeVisible();
    expect(screen.getByText(/도내 7만원/)).toBeVisible();
    await user.tab();
  });
});
