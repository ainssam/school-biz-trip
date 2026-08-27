import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "여비정산 신청서 만들기",
  description: "원본 양식을 유지한 HWP·PDF 여비정산 신청서 생성 도구",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
