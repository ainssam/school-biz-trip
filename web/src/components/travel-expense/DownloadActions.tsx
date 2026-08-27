type DownloadActionsProps = {
  busy: "hwp" | "pdf" | null;
  confirmed: boolean;
  onDownload: (format: "hwp" | "pdf") => void;
};

export function DownloadActions({ busy, confirmed, onDownload }: DownloadActionsProps) {
  return (
    <div className="download-actions">
      <button
        className="button button-primary"
        disabled={busy !== null || !confirmed}
        onClick={() => onDownload("hwp")}
        type="button"
      >
        {busy === "hwp" ? "HWP 만드는 중…" : "HWP 내려받기"}
      </button>
      <button
        className="button button-secondary"
        disabled={busy !== null || !confirmed}
        onClick={() => onDownload("pdf")}
        type="button"
      >
        {busy === "pdf" ? "PDF 만드는 중…" : "PDF 내려받기"}
      </button>
    </div>
  );
}
