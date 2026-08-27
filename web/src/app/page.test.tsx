import { render, screen } from "@testing-library/react";
import Page from "./page";

it("신청서 작성과 작성요령 메뉴를 보여준다", () => {
  render(<Page />);
  expect(screen.getByRole("tab", { name: "신청서 작성" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "작성요령" })).toBeInTheDocument();
});
