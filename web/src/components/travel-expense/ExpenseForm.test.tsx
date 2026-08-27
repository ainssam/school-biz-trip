import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ExpenseForm } from "./ExpenseForm";

describe("여비정산 입력", () => {
  it("출장유형을 자가용으로 고르면 교통편과 운임을 자동으로 바꾼다", async () => {
    const user = userEvent.setup();
    render(<ExpenseForm />);

    await user.selectOptions(screen.getByLabelText("출장유형"), "car");

    expect(screen.getByLabelText("교통편 1")).toHaveValue("자가용");
    expect(screen.getByLabelText("금액 1")).toHaveValue("미기재");
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
