# Confere se as regras citam itens/heróis/tags que existem. Rode antes de mandar um PR:
#   powershell -ExecutionPolicy Bypass -File tools\validar.ps1
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$erros = New-Object System.Collections.Generic.List[string]

function Ler($rel) {
  try { Get-Content (Join-Path $raiz $rel) -Raw -Encoding UTF8 | ConvertFrom-Json }
  catch { $erros.Add("$rel não é um JSON válido: $($_.Exception.Message)"); $null }
}

$tagsValidas = @("gun","spirit","melee","burst","sustain","healer","stun","silence","slow","dot",
  "mobility","stealth","channel-ult","summons","tank","airborne","area","shield")
$condicoesValidas = @("inimigos_tag","aliados_tag","aliados_sem_tag","min","inimigo_heroi","meu_heroi","meu_heroi_tag")

$items = Ler "data/items.json"
$heroes = Ler "data/heroes.json"
$ids = @{}
foreach ($i in $items.itens) {
  if ($ids.ContainsKey($i.id)) { $erros.Add("items.json: id duplicado '$($i.id)'") }
  $ids[$i.id] = $true
  if ($i.categoria -notin @("weapon","vitality","spirit")) { $erros.Add("items.json: '$($i.id)' categoria inválida") }
  if ($i.tier -notin 1..4) { $erros.Add("items.json: '$($i.id)' tier inválido") }
}
$herois = @{}
foreach ($p in $heroes.herois.PSObject.Properties) {
  $herois[$p.Name] = $true
  foreach ($t in $p.Value.tags) { if ($t -notin $tagsValidas) { $erros.Add("heroes.json: $($p.Name) tem tag desconhecida '$t'") } }
}

function ConferirRec($onde, $rec) {
  if (-not $ids.ContainsKey($rec.item)) { $erros.Add("${onde}: item inexistente '$($rec.item)'") }
  if (-not $rec.motivo) { $erros.Add("${onde}: '$($rec.item)' sem motivo") }
  if ($rec.peso -isnot [int] -and $rec.peso -isnot [long] -and $rec.peso -isnot [double]) { $erros.Add("${onde}: '$($rec.item)' sem peso numérico") }
  if ($rec.meu_heroi_tag -and $rec.meu_heroi_tag -notin $tagsValidas) { $erros.Add("${onde}: meu_heroi_tag desconhecida '$($rec.meu_heroi_tag)'") }
}

$regraIds = @{}
foreach ($arq in Get-ChildItem (Join-Path $raiz "data/rules") -Filter *.json) {
  $rel = "data/rules/$($arq.Name)"
  $j = Ler $rel
  if (-not $j) { continue }
  if ($arq.Name -eq "counters-herois.json") {
    foreach ($p in $j.herois.PSObject.Properties) {
      if (-not $herois.ContainsKey($p.Name)) { $erros.Add("${rel}: herói desconhecido '$($p.Name)'") }
      foreach ($c in $p.Value) { ConferirRec "$rel [$($p.Name)]" $c }
    }
    continue
  }
  if ($arq.Name -eq "itens-inimigos.json") {
    foreach ($a in $j.itens) {
      if (-not $ids.ContainsKey($a.item)) { $erros.Add("${rel}: item inexistente '$($a.item)'") }
      if ($a.perigo -notin 1..3) { $erros.Add("${rel}: '$($a.item)' perigo deve ser 1, 2 ou 3") }
      foreach ($c in $a.counters) { ConferirRec "$rel [$($a.item)]" $c }
    }
    continue
  }
  foreach ($r in $j.regras) {
    if ($regraIds.ContainsKey($r.id)) { $erros.Add("${rel}: id de regra duplicado '$($r.id)'") }
    $regraIds[$r.id] = $true
    foreach ($p in $r.quando.PSObject.Properties) {
      if ($p.Name -notin $condicoesValidas) { $erros.Add("${rel} [$($r.id)]: condição desconhecida '$($p.Name)'") }
      if ($p.Name -match "tag$" -and $p.Value -notin $tagsValidas) { $erros.Add("${rel} [$($r.id)]: tag desconhecida '$($p.Value)'") }
      if ($p.Name -in @("inimigo_heroi","meu_heroi")) {
        foreach ($h in @($p.Value)) { if (-not $herois.ContainsKey($h)) { $erros.Add("${rel} [$($r.id)]: herói desconhecido '$h'") } }
      }
    }
    foreach ($rec in $r.recomendar) { ConferirRec "$rel [$($r.id)]" $rec }
  }
}

$builds = Ler "data/builds.json"
if ($builds) {
  foreach ($p in $builds.herois.PSObject.Properties) {
    if (-not $herois.ContainsKey($p.Name)) { $erros.Add("data/builds.json: herói desconhecido '$($p.Name)'") }
    foreach ($fase in "inicio", "meio", "fim") {
      foreach ($linha in $p.Value.$fase) { if (-not $ids.ContainsKey($linha[0])) { $erros.Add("data/builds.json [$($p.Name)/$fase]: item inexistente '$($linha[0])'") } }
    }
  }
}

if ($erros.Count -gt 0) {
  Write-Host "Encontrei $($erros.Count) problema(s):" -ForegroundColor Red
  $erros | ForEach-Object { Write-Host "  - $_" }
  exit 1
}
Write-Host "Tudo certo: $($ids.Count) itens, $($herois.Count) heróis, $($regraIds.Count) regras." -ForegroundColor Green
