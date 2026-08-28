import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "./download";

describe("브라우저 파일 다운로드", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("다운로드 클릭 직후 Blob URL을 해제하지 않는다", () => {
    vi.useFakeTimers();
    const objectUrl = "blob:hwp-result";
    vi.spyOn(URL, "createObjectURL").mockReturnValue(objectUrl);
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadBlob(new Blob(["hwp"]), "여비정산신청서_테스트.hwp");

    const anchor = document.querySelector("a[download]");
    expect(anchor).toHaveAttribute("href", objectUrl);
    expect(anchor).toHaveAttribute("download", "여비정산신청서_테스트.hwp");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(999);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
    expect(document.querySelector("a[download]")).not.toBeInTheDocument();
  });
});
