export type PdfTextAlign = "left" | "center" | "right";

export type PdfField = {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  align: PdfTextAlign;
};

const centered = (
  x: number,
  y: number,
  width: number,
  fontSize = 9,
): PdfField => ({ x, y, width, fontSize, align: "center" });

const left = (
  x: number,
  y: number,
  width: number,
  fontSize = 9,
): PdfField => ({ x, y, width, fontSize, align: "left" });

export const pdfFieldMap = {
  school: centered(103, 658, 195),
  position: centered(340, 658, 92),
  name: centered(471, 658, 65),
  schedule: centered(183, 638, 352),
  destination: left(186, 621, 346),
  purpose: left(186, 603, 346),
  lodgingPaid: centered(182, 566, 57),
  lodgingActual: centered(290, 566, 57),
  lodgingReason: centered(418, 566, 117),
  mealsPaid: centered(182, 527, 57),
  mealsActual: centered(290, 527, 57),
  mealsReason: centered(418, 527, 117),
  routes: [
    {
      date: centered(102, 470, 79),
      transport: centered(182, 470, 57),
      from: centered(240, 470, 49),
      to: centered(290, 470, 57),
      grade: centered(349, 470, 68),
      fare: centered(418, 470, 118),
    },
    {
      date: centered(102, 447, 79),
      transport: centered(182, 447, 57),
      from: centered(240, 447, 49),
      to: centered(290, 447, 57),
      grade: centered(349, 447, 68),
      fare: centered(418, 447, 118),
    },
    {
      date: centered(102, 424, 79),
      transport: centered(182, 424, 57),
      from: centered(240, 424, 49),
      to: centered(290, 424, 57),
      grade: centered(349, 424, 68),
      fare: centered(418, 424, 118),
    },
    {
      date: centered(102, 401, 79),
      transport: centered(182, 401, 57),
      from: centered(240, 401, 49),
      to: centered(290, 401, 57),
      grade: centered(349, 401, 68),
      fare: centered(418, 401, 118),
    },
  ],
  attachments: left(65, 302, 465),
  applicationDate: centered(205, 264, 185),
  signature: centered(265, 206, 270),
} as const;
