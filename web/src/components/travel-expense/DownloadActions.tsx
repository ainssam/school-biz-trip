type DownloadActionsProps = {
  busy: "hwp" | "pdf" | null;
  batch?: boolean;
  confirmed: boolean;
  onDownload: (format: "hwp" | "pdf") => void;
};

export function DownloadActions({
  busy,
  batch = false,
  confirmed,
  onDownload,
}: DownloadActionsProps) {
  return (
    <div className="download-actions">
      <button
        className="button button-primary"
        disabled={busy !== null || !confirmed}
        onClick={() => onDownload("hwp")}
        type="button"
      >
        {busy === "hwp"
          ? "HWP 만드는 중…"
          : `${batch ? "일괄 " : ""}HWP 내려받기`}
      </button>
      <button
        className="button button-secondary"
        disabled={busy !== null || !confirmed}
        onClick={() => onDownload("pdf")}
        type="button"
      >
        {busy === "pdf"
          ? "PDF 만드는 중…"
          : `${batch ? "일괄 " : ""}PDF 내려받기`}
      </button>
    </div>
  );
}
