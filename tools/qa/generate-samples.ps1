param(
  [string]$BaseUrl = "http://127.0.0.1:3737",
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\..\artifacts\qa\samples")
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$types = @(
  @{ key = "public"; label = "대중교통"; transport = "철도"; fare = 12000; attachment = @("rail") },
  @{ key = "car"; label = "자가용"; transport = "자가용"; fare = "미기재"; attachment = @("fuel", "toll") },
  @{ key = "ride"; label = "차량동승"; transport = "차량동승"; fare = "미기재"; attachment = @() },
  @{ key = "charter"; label = "전세버스"; transport = "전세버스"; fare = "미기재"; attachment = @() }
)

$results = @()
foreach ($type in $types) {
  $payload = @{
    school = "가온고등학교"
    position = "교사"
    name = "테스트교사"
    tripStart = "2026-08-27"
    tripEnd = "2026-08-27"
    applicationDate = "2026-08-28"
    destination = "서울 교육연수원"
    purpose = "교육과정 담당자 연수 참석"
    travelType = $type.key
    routes = @(
      @{ date = "2026-08-27"; transport = $type.transport; from = "천안"; to = "서울"; grade = "제2호"; fare = $type.fare },
      @{ date = "2026-08-27"; transport = $type.transport; from = "서울"; to = "천안"; grade = "제2호"; fare = $type.fare }
    )
    lodging = @{ paid = $null; actual = $null; reason = "" }
    meals = @{ paid = $null; actual = $null; reason = "" }
    attachments = $type.attachment
    attachmentOther = ""
  } | ConvertTo-Json -Depth 8

  foreach ($format in @("hwp", "pdf")) {
    $destination = Join-Path $OutputDirectory ("여비정산_" + $type.label + "." + $format)
    Invoke-WebRequest -Uri "$BaseUrl/api/generate/$format" -Method Post -ContentType "application/json; charset=utf-8" -Body $payload -OutFile $destination
    $results += [pscustomobject]@{
      type = $type.key
      format = $format
      bytes = (Get-Item -LiteralPath $destination).Length
    }
  }
}

$results | ConvertTo-Json -Compress
