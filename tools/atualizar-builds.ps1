# Gera data/builds.json a partir dos dados de popularidade de itens que o próprio jogo traz
# (scripts/heroes.vdata -> m_PopularItems: % de escolha e % de vitória por herói e fase da partida).
#   powershell -ExecutionPolicy Bypass -File tools\atualizar-builds.ps1 [-Arquivo heroes.vdata]
param([string]$Arquivo, [double]$MinPick = 4.0, [int]$MaxPorFase = 18)
$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false

if (-not $Arquivo) {
  $Arquivo = Join-Path $env:TEMP "deadlock_heroes.vdata"
  $url = "https://raw.githubusercontent.com/SteamTracking/GameTracking-Deadlock/master/game/citadel/pak01_dir/scripts/heroes.vdata"
  Write-Host "Baixando heroes.vdata do GameTracking-Deadlock..."
  Invoke-WebRequest -UseBasicParsing $url -OutFile $Arquivo
}

$items = ([IO.File]::ReadAllText((Join-Path $Raiz "data\items.json"), [Text.Encoding]::UTF8) | ConvertFrom-Json).itens
$classeParaItem = @{}
foreach ($it in $items) { foreach ($c in $it.classes) { $classeParaItem[$c] = $it.id } }
$heroes = ([IO.File]::ReadAllText((Join-Path $Raiz "data\heroes.json"), [Text.Encoding]::UTF8) | ConvertFrom-Json).herois
$classeParaHeroi = @{}
foreach ($p in $heroes.PSObject.Properties) { $classeParaHeroi[$p.Value.classe] = $p.Name }

$fases = @{ "ECitadelItemGamePhase_EarlyGame" = "inicio"; "ECitadelItemGamePhase_MidGame" = "meio"; "ECitadelItemGamePhase_LateGame" = "fim" }
$builds = [ordered]@{}
$heroi = $null; $fase = $null; $item = $null; $pick = $null; $timestamp = 0
foreach ($linha in [IO.File]::ReadLines($Arquivo)) {
  if ($linha -match '^\t(hero_[a-z0-9_]+) =') { $heroi = $classeParaHeroi[$matches[1]]; $fase = $null; continue }
  if (-not $heroi) { continue }
  if ($linha -match 'm_unTimestamp = (\d+)') { $timestamp = [math]::Max($timestamp, [long]$matches[1]) }
  if ($linha -match '^\t{4}(ECitadelItemGamePhase_\w+) =') { $fase = $fases[$matches[1]]; continue }
  if ($fase -and $linha -match '^\t{5}(upgrade_\w+) =') { $item = $classeParaItem[$matches[1]]; $pick = $null; continue }
  if ($fase -and $item -and $linha -match 'm_flPickPct = ([\d.]+)') { $pick = [double]$matches[1]; continue }
  if ($fase -and $item -and $null -ne $pick -and $linha -match 'm_flWinratePct = ([\d.]+)') {
    if ($pick -ge $MinPick) {
      if (-not $builds.Contains($heroi)) { $builds[$heroi] = [ordered]@{ inicio = @(); meio = @(); fim = @() } }
      $builds[$heroi][$fase] += , @($item, [math]::Round($pick, 1), [math]::Round([double]$matches[1], 1))
    }
    $item = $null
  }
}

# JSON compacto e legível: uma linha por fase.
$sb = New-Object Text.StringBuilder
[void]$sb.AppendLine("{")
[void]$sb.AppendLine("  `"_info`": `"Gerado por tools/atualizar-builds.ps1 a partir de m_PopularItems do jogo. Cada item: [id, % de escolha, % de vitória]. Fases: inicio/meio/fim.`",")
[void]$sb.AppendLine("  `"atualizado`": $timestamp,")
[void]$sb.AppendLine("  `"herois`": {")
$nomes = @($builds.Keys | Sort-Object)
for ($i = 0; $i -lt $nomes.Count; $i++) {
  $h = $nomes[$i]
  [void]$sb.AppendLine("    `"$h`": {")
  $fs = @("inicio", "meio", "fim")
  for ($k = 0; $k -lt 3; $k++) {
    $lista = @($builds[$h][$fs[$k]] | Sort-Object { - $_[1] } | Select-Object -First $MaxPorFase)
    $txt = ($lista | ForEach-Object { "[`"$($_[0])`",$($_[1].ToString([Globalization.CultureInfo]::InvariantCulture)),$($_[2].ToString([Globalization.CultureInfo]::InvariantCulture))]" }) -join ","
    $virg = if ($k -lt 2) { "," } else { "" }
    [void]$sb.AppendLine("      `"$($fs[$k])`": [$txt]$virg")
  }
  $virg = if ($i -lt $nomes.Count - 1) { "," } else { "" }
  [void]$sb.AppendLine("    }$virg")
}
[void]$sb.AppendLine("  }")
[void]$sb.AppendLine("}")
[IO.File]::WriteAllText((Join-Path $Raiz "data\builds.json"), $sb.ToString(), $utf8)
Write-Host "data\builds.json: $($nomes.Count) heróis." -ForegroundColor Green
