export type PdfTextAlign = "left" | "center" | "right";

export type PdfField = {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  align: PdfTextAlign;
};
