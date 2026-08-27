param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$PdfDestination
)

$ErrorActionPreference = "Stop"
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$pdfPath = [IO.Path]::GetFullPath($PdfDestination)
$pdfDirectory = Split-Path -Parent $pdfPath
New-Item -ItemType Directory -Force -Path $pdfDirectory | Out-Null

$hwp = $null
try {
  $hwp = New-Object -ComObject HWPFrame.HwpObject
  $null = $hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModuleExample")
  $hwp.XHwpWindows.Item(0).Visible = $false
  if (-not $hwp.Open($sourcePath, "HWP", "forceopen:true")) {
    throw "한컴오피스에서 생성 HWP를 열지 못했습니다."
  }
  $pageCount = $hwp.PageCount
  if ($pageCount -ne 1) {
    throw "생성 HWP가 한 페이지가 아닙니다: $pageCount"
  }
  if (-not $hwp.SaveAs($pdfPath, "PDF", "")) {
    throw "한컴오피스에서 검증 PDF를 저장하지 못했습니다."
  }
}
finally {
  if ($null -ne $hwp) {
    try { $hwp.Quit() } catch {}
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($hwp) | Out-Null
  }
}

$header = [IO.File]::ReadAllBytes($pdfPath)[0..3]
if ([Text.Encoding]::ASCII.GetString($header) -ne "%PDF") {
  throw "한컴 검증 PDF의 파일 헤더가 올바르지 않습니다."
}

[pscustomobject]@{
  status = "success"
  pageCount = $pageCount
  pdfBytes = (Get-Item -LiteralPath $pdfPath).Length
} | ConvertTo-Json -Compress
