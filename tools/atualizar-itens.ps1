# Gera data/itens-detalhes.json: descrição e atributos de cada item, nos idiomas do mod, para o tooltip
# do editor de counters (o tooltip nativo do jogo não abre em painéis criados pelo mod).
# Fonte: https://api.deadlock-api.com/v1/assets/items?language=<idioma> (textos e números do próprio jogo).
#   powershell -ExecutionPolicy Bypass -File tools\atualizar-itens.ps1 [-Pasta <pasta com itens-<idioma>.json>]
# Este arquivo precisa ficar em UTF-8 COM BOM.
param([string]$Pasta)
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Raiz = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false
$idiomas = [ordered]@{ en = "english"; pt = "brazilian"; es = "spanish"; ru = "russian" }

$itens = ([IO.File]::ReadAllText((Join-Path $Raiz "data\items.json"), [Text.Encoding]::UTF8).TrimStart([char]0xFEFF) | ConvertFrom-Json).itens

function Json([string]$s) {
  $sb = New-Object Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    switch ($ch) {
      '"' { [void]$sb.Append('\"') } '\' { [void]$sb.Append('\\') }
      "`n" { [void]$sb.Append('\n') } "`r" { } "`t" { [void]$sb.Append(' ') }
      default { [void]$sb.Append($ch) }
    }
  }
  '"' + $sb.ToString() + '"'
}
# HTML do jogo -> o que o Label do Panorama mostra bem.
function Texto([string]$s) {
  if (-not $s) { return "" }
  $s = [regex]::Replace($s, '<span class="highlight[^"]*">(.*?)</span>', "<b>`$1</b>")
  $s = [regex]::Replace($s, '<span class="diminish[^"]*">(.*?)</span>', "<font color='#9a9a9a'>`$1</font>")
  $s = [regex]::Replace($s, '<(?!/?(b|br|font)\b)[^>]*>', '')
  $s = [regex]::Replace($s, '\{[^}]*\}', '')
  return ($s -replace '\s+', ' ').Trim()
}
function Valor($p) {
  $v = "" + $p.value
  if ($v -eq "" -or $v -eq "0" -or $v -eq "0m") { return $null }
  $pre = "" + $p.prefix
  if ($pre -eq "{s:sign}") { $pre = $(if ($v.StartsWith("-")) { "" } else { "+" }) }
  $pos = "" + $p.postfix
  if ($pos -and $v.EndsWith($pos)) { $pos = "" }
  return "$pre$v$pos"
}

$saida = foreach ($i in $idiomas.Keys) {
  $arq = if ($Pasta) { Join-Path $Pasta "itens-$($idiomas[$i]).json" } else { $null }
  if ($arq -and (Test-Path $arq)) { $txt = [IO.File]::ReadAllText($arq, [Text.Encoding]::UTF8) }
  else {
    Write-Host "Baixando itens ($($idiomas[$i]))..."
    $txt = [Text.Encoding]::UTF8.GetString((Invoke-WebRequest -UseBasicParsing "https://api.deadlock-api.com/v1/assets/items?language=$($idiomas[$i])").RawContentStream.ToArray())
  }
  $porClasse = @{}
  foreach ($a in ($txt | ConvertFrom-Json)) { $porClasse[$a.class_name] = $a }
  $linhas = foreach ($it in $itens) {
    $a = $null
    foreach ($c in $it.classes) { if ($porClasse[$c]) { $a = $porClasse[$c]; break } }
    if (-not $a) { Write-Warning "${i}: $($it.id) sem dados na API"; continue }
    $secoes = foreach ($s in $a.tooltip_sections) {
      $tipo = "" + $s.section_type
      foreach ($at in $s.section_attributes) {
        $stats = foreach ($nome in @($at.important_properties) + @($at.properties) + @($at.elevated_properties)) {
          if (-not $nome) { continue }
          $p = $a.properties.$nome
          if (-not $p -or -not $p.label) { continue }
          $v = Valor $p
          if ($v) { "[" + (Json $v) + "," + (Json (Texto $p.label)) + "]" }
        }
        $t = Texto $at.loc_string
        if ($t -or $stats) { "{`"tipo`":" + (Json $tipo) + ",`"txt`":" + (Json $t) + ",`"st`":[" + (@($stats) -join ",") + "]}" }
      }
    }
    "    `"$($it.id)`": [" + (@($secoes) -join ",") + "]"
  }
  "  `"$i`": {`n" + (@($linhas) -join ",`n") + "`n  }"
}
$json = "{`n  `"_info`": `"Gerado por tools/atualizar-itens.ps1 (deadlock-api.com /v1/assets/items). Seções do tooltip de cada item: tipo (innate/active/passive), texto e atributos [valor, nome].`",`n" + ($saida -join ",`n") + "`n}`n"
$destino = Join-Path $Raiz "data\itens-detalhes.json"
[IO.File]::WriteAllText($destino, $json, $utf8)
[void]([IO.File]::ReadAllText($destino, [Text.Encoding]::UTF8) | ConvertFrom-Json)
Write-Host ("Pronto: {0} ({1:N0} bytes)" -f $destino, (Get-Item $destino).Length) -ForegroundColor Green
