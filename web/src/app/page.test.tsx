import { render, screen } from "@testing-library/react";
import Page from "./page";

it("신청서 작성과 작성요령 메뉴를 보여준다", () => {
  render(<Page />);
  expect(screen.getByRole("tab", { name: "신청서 작성" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "작성요령" })).toBeInTheDocument();
});

it("간결한 업무 화면 머리글에서 문서명과 개인정보 보호 안내를 보여준다", () => {
  render(<Page />);

  const banner = screen.getByRole("banner");
  expect(
    screen.getByRole("heading", { level: 1, name: "여비정산 신청서" }),
  ).toBeInTheDocument();
  expect(banner).toHaveTextContent("개인정보 보호");
});
