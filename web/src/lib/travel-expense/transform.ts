import type { RouteInput } from "./schema";

type FareOnly = { fare?: unknown };
type FilenameInput = { name: string; tripStart: string };

export function makeReturnRoute<T extends { from: string; to: string }>(
  route: T,
): T {
  return {
    ...route,
    from: route.to,
    to: route.from,
  };
}

export function sumFare(routes: FareOnly[]): number {
  return routes.reduce(
    (sum, route) =>
      sum +
      (typeof route.fare === "number" && Number.isFinite(route.fare)
        ? route.fare
        : 0),
    0,
  );
}

export function formatFareForOutput(
  value: RouteInput["fare"] | null | undefined,
): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("ko-KR")
    : "";
}

export function makeDownloadFilename(
  input: FilenameInput,
  extension: "hwp" | "pdf",
): string {
  const safeName = input.name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/[. ]+$/g, "")
    .trim();
  return `여비정산신청서_${safeName || "신청인"}_${input.tripStart}.${extension}`;
}
