param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [Parameter(Mandatory = $true)]
  [string]$ClawHwpScripts
)

$ErrorActionPreference = "Stop"
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("travel-expense-sanitize-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null
$working = Join-Path $tempRoot "working.hwp"
Copy-Item -LiteralPath $Source -Destination $working

$hwp = $null
try {
  $hwp = New-Object -ComObject HWPFrame.HwpObject
  $null = $hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModuleExample")
  $hwp.XHwpWindows.Item(0).Visible = $false
  if (-not $hwp.Open($working, "HWP", "forceopen:true")) {
    throw "한컴오피스에서 작업 복사본을 열지 못했습니다."
  }

  $null = $hwp.HAction.Run("MoveDocBegin")
  $null = $hwp.HAction.Run("MovePageDown")
  $null = $hwp.HAction.Run("Select")
  $null = $hwp.HAction.Run("MoveDocEnd")
  $null = $hwp.HAction.Run("Delete")

  for ($attempt = 0; $attempt -lt 8 -and $hwp.PageCount -gt 1; $attempt++) {
    $null = $hwp.HAction.Run("MoveDocEnd")
    $null = $hwp.HAction.Run("DeleteBack")
  }
  if ($hwp.PageCount -ne 1) {
    throw "한 페이지 템플릿으로 축소하지 못했습니다: $($hwp.PageCount)쪽"
  }

  if (-not $hwp.SaveAs($working, "HWP", "")) {
    throw "한컴오피스에서 한 페이지 복사본을 저장하지 못했습니다."
  }
}
finally {
  if ($null -ne $hwp) {
    try { $hwp.Quit() } catch {}
    [Runtime.InteropServices.Marshal]::FinalReleaseComObject($hwp) | Out-Null
  }
}

$operations = @()
$valueCells = @(
  @(0, 1), @(0, 6), @(0, 10),
  @(1, 2), @(2, 2), @(3, 2),
  @(4, 2), @(4, 4), @(4, 8),
  @(5, 2), @(5, 4), @(5, 8)
)

foreach ($cell in $valueCells) {
  $operations += @{
    type = "set_cell_text"
    section = 0
    para = 3
    control = 0
    row = $cell[0]
    col = $cell[1]
    text = ""
    clear_objects = $true
  }
}

foreach ($row in 7..10) {
  foreach ($col in @(1, 2, 3, 4, 7, 8)) {
    $operations += @{
      type = "set_cell_text"
      section = 0
      para = 3
      control = 0
      row = $row
      col = $col
      text = ""
      clear_objects = $true
    }
  }
}

foreach ($cellParagraph in @(2, 4)) {
  $operations += @{
    type = "set_cell_text"
    section = 0
    para = 3
    control = 0
    row = 11
    col = 0
    cell_para = $cellParagraph
    text = ""
    clear_objects = $true
  }
}

$operations += @{
  type = "set_cell_text"
  section = 0
  para = 3
  control = 0
  row = 11
  col = 0
  cell_para = 7
  text = ""
  clear_objects = $true
}

$payload = @{
  path = $working
  operations = $operations
} | ConvertTo-Json -Depth 8 -Compress

$result = $payload | node (Join-Path $ClawHwpScripts "create.js") | ConvertFrom-Json
if ($result.status -ne "success") {
  throw "HWP 빈 양식 패치 실패(op $($result.op_index)): $($result.message)"
}

$inspection = node (Join-Path $ClawHwpScripts "extract_text.js") --inspect $working | ConvertFrom-Json
if ($inspection.tableCount -ne 1) {
  throw "한 페이지 템플릿의 표 수가 1이 아닙니다: $($inspection.tableCount)"
}

Copy-Item -LiteralPath $working -Destination $Destination -Force

[pscustomobject]@{
  status = "success"
  tableCount = $inspection.tableCount
  cellCount = $inspection.cellCount
  bytes = (Get-Item -LiteralPath $Destination).Length
} | ConvertTo-Json -Compress
