export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();

  // Chromium can start a Blob download on the next task, especially when the
  // response came from a remote function. Keep the URL alive until then.
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    anchor.remove();
  }, 1000);
}
