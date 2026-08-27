param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Destination
)

$ErrorActionPreference = "Stop"
$hwp = $null
try {
  $hwp = New-Object -ComObject HWPFrame.HwpObject
  $null = $hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModuleExample")
  $hwp.XHwpWindows.Item(0).Visible = $false
  if (-not $hwp.Open((Resolve-Path -LiteralPath $Source), "HWP", "forceopen:true")) {
    throw "한컴오피스에서 빈 템플릿을 열지 못했습니다."
  }

  $targetDirectory = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $targetDirectory)) {
    New-Item -ItemType Directory -Path $targetDirectory | Out-Null
  }
  $absoluteDestination = [IO.Path]::GetFullPath($Destination)
  $temporaryPdf = [IO.Path]::GetFullPath(
    (Join-Path $targetDirectory ("travel-expense-template-" + [guid]::NewGuid().ToString("N") + ".pdf"))
  )
  if (-not $hwp.SaveAs($temporaryPdf, "PDF", "")) {
    throw "한컴오피스에서 기준 PDF를 저장하지 못했습니다."
  }
}
finally {
  if ($null -ne $hwp) {
    try { $hwp.Quit() } catch {}
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($hwp) | Out-Null
  }
}

Copy-Item -LiteralPath $temporaryPdf -Destination $absoluteDestination -Force
Remove-Item -LiteralPath $temporaryPdf -Force

$header = [IO.File]::ReadAllBytes([IO.Path]::GetFullPath($Destination))[0..3]
if ([Text.Encoding]::ASCII.GetString($header) -ne "%PDF") {
  throw "기준 PDF의 파일 헤더가 올바르지 않습니다."
}

[pscustomobject]@{
  status = "success"
  bytes = (Get-Item -LiteralPath $Destination).Length
} | ConvertTo-Json -Compress
