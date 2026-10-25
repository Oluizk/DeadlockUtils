# Compila o mod do jogo: gera build\pakNN_dir.vpk com
#   panorama/layout/hud.vxml_c                 (hud.xml original + nosso script/estilo incluídos)
#   panorama/scripts/deadlock_utils.vts_c
#   panorama/styles/deadlock_utils.vcss_c
#   panorama/layout/deadlock_utils_<nome>.vxml_c   (mod/layout/<nome>.xml)
#
#   powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 [-Jogo <pasta do Deadlock>] [-AtualizarHud]
param(
  [string]$Jogo,
  [int]$Pak = 42,
  [switch]$AtualizarHud
)
. (Join-Path $PSScriptRoot "jogo.ps1")

$VersaoMod = "0.8.0"
$Nome = "deadlock_utils"
$utf8 = New-Object Text.UTF8Encoding $false
function Ler([string]$rel) { [IO.File]::ReadAllText((Join-Path $Raiz $rel), [Text.Encoding]::UTF8).TrimStart([char]0xFEFF) }

$Jogo = Find-Deadlock $Jogo
$versaoJogo = Get-VersaoJogo $Jogo
Write-Host "Deadlock: $Jogo (versão $versaoJogo)"

# 0) As regras precisam estar válidas.
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "validar.ps1")
if ($LASTEXITCODE -ne 0) { throw "Corrija as regras antes de compilar." }

# 1) hud.xml original. Ele precisa ser da MESMA versão do jogo, senão o HUD quebra.
$hudVendor = Join-Path $Raiz "mod\vendor\hud.xml"
$hudVersaoArq = Join-Path $Raiz "mod\vendor\hud.versao.txt"
if ($AtualizarHud) {
  Write-Host "Baixando hud.xml atual do GameTracking-Deadlock..."
  $url = "https://raw.githubusercontent.com/SteamTracking/GameTracking-Deadlock/master/game/citadel/pak01_dir/panorama/layout/hud.xml"
  $urlInf = "https://raw.githubusercontent.com/SteamTracking/GameTracking-Deadlock/master/game/citadel/steam.inf"
  [IO.File]::WriteAllText($hudVendor, (Invoke-WebRequest -UseBasicParsing $url).Content, $utf8)
  $inf = (Invoke-WebRequest -UseBasicParsing $urlInf).Content
  $v = ([regex]::Match($inf, "ClientVersion=(\d+)")).Groups[1].Value
  [IO.File]::WriteAllText($hudVersaoArq, $v, $utf8)
}
$versaoHud = ([IO.File]::ReadAllText($hudVersaoArq)).Trim()
if ($versaoHud -ne $versaoJogo) {
  Write-Host "ATENÇÃO: hud.xml do mod é da versão $versaoHud e o jogo está na $versaoJogo." -ForegroundColor Yellow
  Write-Host "         Rode com -AtualizarHud (quando o GameTracking já tiver o patch novo)." -ForegroundColor Yellow
}
$hud = Ler "mod\vendor\hud.xml"
$hud = [regex]::Replace($hud, "^\s*<!--.*?-->\s*", "", "Singleline")
if ($hud -notmatch "<CitadelHud") { throw "mod\vendor\hud.xml não parece o hud.xml do jogo." }
$incEstilo = "<include src=`"s2r://panorama/styles/$Nome.vcss_c`" />"
$incScript = "<include src=`"s2r://panorama/scripts/$Nome.vts_c`" />"
$i = $hud.IndexOf("</styles>")
if ($i -lt 0) { throw "hud.xml sem </styles>" }
$hud = $hud.Insert($i, "`t$incEstilo`n`t")
if ($hud.Contains("</scripts>")) {
  $hud = $hud.Insert($hud.IndexOf("</scripts>"), "`t$incScript`n`t")
} else {
  $j = $hud.IndexOf("</styles>") + "</styles>".Length
  $hud = $hud.Insert($j, "`n`t<scripts>`n`t`t$incScript`n`t</scripts>")
}

# 2) Nomes dos heróis em todos os idiomas do jogo (o placar mostra o nome localizado).
$heroes = Ler "data\heroes.json" | ConvertFrom-Json
$classeParaNome = @{}
foreach ($p in $heroes.herois.PSObject.Properties) { $classeParaNome[$p.Value.classe] = $p.Name }
$nomes = @{}
foreach ($p in $heroes.herois.PSObject.Properties) { $nomes[$p.Name.ToLower()] = $p.Name }
$loc = Join-Path $Jogo "game\citadel\resource\localization\citadel_gc_hero_names"
foreach ($arq in Get-ChildItem $loc -Filter "*.txt") {
  foreach ($linha in [IO.File]::ReadAllLines($arq.FullName, [Text.Encoding]::UTF8)) {
    if ($linha -match '^\s*"(hero_[a-z0-9_]+)(:n)?"\s+"([^"]+)"') {
      $heroi = $classeParaNome[$matches[1]]
      if ($heroi) { $nomes[$matches[3].ToLower().Trim()] = $heroi }
    }
  }
}
$nomesJson = "{" + (($nomes.GetEnumerator() | Sort-Object Name | ForEach-Object {
  '"' + $_.Name.Replace('\', '\\').Replace('"', '\"') + '":"' + $_.Value.Replace('"', '\"') + '"'
}) -join ",") + "}"
Write-Host "Nomes de heróis (todos os idiomas): $($nomes.Count)"

# 2b) Nomes dos ITENS em todos os idiomas (a loja mostra o nome localizado no cartão do item).
$itensDados = (Ler "data\items.json" | ConvertFrom-Json).itens
$classeParaItem = @{}
foreach ($it in $itensDados) { foreach ($c in $it.classes) { $classeParaItem[$c] = $it.id } }
$nomesItens = @{}
foreach ($it in $itensDados) { $nomesItens[$it.nome.ToLower()] = $it.id; if ($it.nome_pt) { $nomesItens[$it.nome_pt.ToLower()] = $it.id } }
$locItens = Join-Path $Jogo "game\citadel\resource\localization\citadel_gc_mod_names"
foreach ($arq in Get-ChildItem $locItens -Filter "*.txt") {
  foreach ($linha in [IO.File]::ReadAllLines($arq.FullName, [Text.Encoding]::UTF8)) {
    if ($linha -match '^\s*"(upgrade_[a-z0-9_]+)"\s+"([^"]+)"') {
      $id = $classeParaItem[$matches[1]]
      if ($id) { $nomesItens[$matches[2].ToLower().Trim()] = $id }
    }
  }
}
$nomesItensJson = "{" + (($nomesItens.GetEnumerator() | Sort-Object Name | ForEach-Object {
  '"' + $_.Name.Replace('\', '\\').Replace('"', '\"') + '":"' + $_.Value + '"'
}) -join ",") + "}"
Write-Host "Nomes de itens (todos os idiomas): $($nomesItens.Count)"
# ID de cada item no jogo (para abrir o tooltip nativo com CitadelShowModTooltip).
$idsJogoJson = "{" + (($itensDados | ForEach-Object { '"' + $_.id + '":' + [S2Hash]::Murmur2($_.classes[0]) }) -join ",") + "}"

# 3) Configuração: seu id Steam (SteamID3) é a pasta em Steam\userdata que tem o Deadlock (1422450).
$config = Ler "data\config.json" | ConvertFrom-Json
if (-not $config.accountId) {
  $steam = (Get-ItemProperty "HKCU:\Software\Valve\Steam" -ErrorAction SilentlyContinue).SteamPath
  if ($steam) {
    $conta = Get-ChildItem (Join-Path $steam "userdata") -Directory -ErrorAction SilentlyContinue |
      Where-Object { Test-Path (Join-Path $_.FullName "1422450") } |
      Sort-Object { (Get-Item (Join-Path $_.FullName "1422450")).LastWriteTime } -Descending | Select-Object -First 1
    if ($conta) { $config.accountId = [long]$conta.Name; Write-Host "Conta Steam detectada: $($conta.Name)" }
  }
}
$configJson = $config | ConvertTo-Json -Depth 6 -Compress

# 4) Script: dados + motor + módulos do mod (mod/src/*.js em ordem), num arquivo só.
$arquivosRegras = Get-ChildItem (Join-Path $Raiz "data\rules") -Filter "*.json" |
  Where-Object { $_.Name -notin @("itens-inimigos.json", "counters-herois.json") } | Sort-Object Name
$regrasJs = ($arquivosRegras | ForEach-Object { Ler "data\rules\$($_.Name)" }) -join ",`n"
# Todos os módulos dividem o mesmo escopo: o mesmo nome em dois "var"/"function" de topo quebra o mod.
$nomesTopo = @{}
foreach ($arq in Get-ChildItem (Join-Path $Raiz "mod\src") -Filter "*.js") {
  foreach ($m in [regex]::Matches((Ler "mod\src\$($arq.Name)"), "(?m)^(?:var|function) ([A-Za-z_$][\w$]*)")) {
    $n = $m.Groups[1].Value
    if ($nomesTopo.ContainsKey($n) -and $nomesTopo[$n] -ne $arq.Name) { throw "Nome '$n' declarado em $($nomesTopo[$n]) e em $($arq.Name)" }
    $nomesTopo[$n] = $arq.Name
  }
}
$modulos = (Get-ChildItem (Join-Path $Raiz "mod\src") -Filter "*.js" | Sort-Object Name | ForEach-Object {
  "// ---------- mod/src/$($_.Name) ----------`n" + (Ler "mod\src\$($_.Name)")
}) -join "`n"
$js = @"
// Deadlock Utils v$VersaoMod, gerado por tools/build-mod.ps1. NÃO edite: edite mod/src/*.js e data/.
var DU_DATA = {
versao: "$VersaoMod",
versaoJogo: "$versaoJogo",
config: $configJson,
items: $(Ler "data\items.json"),
heroes: $(Ler "data\heroes.json"),
builds: $(Ler "data\builds.json"),
mapa: $(Ler "data\mapa.json"),
textos: $(Ler "data\textos.json"),
countersHerois: $(Ler "data\rules\counters-herois.json"),
ameacas: $(Ler "data\rules\itens-inimigos.json"),
regrasArquivos: [
$regrasJs
],
nomesHerois: $nomesJson,
nomesItens: $nomesItensJson,
idsJogo: $idsJogoJson
};
$(Ler "app\engine.js")
(function () {
"use strict";
$modulos
})();
"@
# 5) CSS: o Panorama não entende alguns seletores e um CSS inválido derruba o HUD inteiro.
$css = Ler "mod\estilo.css"
$semComentarios = [regex]::Replace($css, "/\*.*?\*/", "", "Singleline")
foreach ($m in [regex]::Matches($semComentarios, "([^{}]*)\{")) {
  $sel = $m.Groups[1].Value
  if ($sel -match "[+~]" -or $sel -match "::|:(not|is|where|has|nth-[a-z-]+)\(") { throw "CSS: seletor não suportado pelo Panorama: '$($sel.Trim())'" }
}

# 6) Modelos (blocos de metadados) tirados do próprio jogo.
$dirVpk = Join-Path $Jogo "game\citadel\pak01_dir.vpk"
$te = [uint32]0
$entradas = [Vpk]::ReadDir($dirVpk, [ref]$te)
function Modelo([string]$caminho) {
  $e = $entradas | Where-Object { $_.Path -eq $caminho } | Select-Object -First 1
  if (-not $e) { throw "Arquivo modelo não encontrado no jogo: $caminho" }
  return [Vpk]::Extract($dirVpk, $e, $te)
}
$modeloXml = Modelo "panorama/layout/hud.vxml_c"
$modeloXmlPequeno = Modelo "panorama/layout/citadel_hud_top_bar_team.vxml_c"
$modeloCss = Modelo "panorama/styles/hud.vcss_c"
$modeloJs = Modelo "panorama/scripts/async.vts_c"

# 7) Compila e empacota.
$build = Join-Path $Raiz "build"
$stage = Join-Path $build "stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
foreach ($d in "panorama\layout", "panorama\scripts", "panorama\styles") { New-Item -ItemType Directory -Force (Join-Path $stage $d) | Out-Null }
[IO.File]::WriteAllBytes((Join-Path $stage "panorama\layout\hud.vxml_c"), [S2Resource]::CompileXml($hud, $modeloXml))
[IO.File]::WriteAllBytes((Join-Path $stage "panorama\styles\$Nome.vcss_c"), [S2Resource]::CompileCss($css, $modeloCss))
# Layouts próprios: mod/layout/<x>.xml -> panorama/layout/deadlock_utils_<x>.vxml_c
foreach ($arq in Get-ChildItem (Join-Path $Raiz "mod\layout") -Filter "*.xml") {
  $destino = "{0}_{1}.vxml_c" -f $Nome, $arq.BaseName
  $xml = Ler "mod\layout\$($arq.Name)"
  if ($xml -notmatch "$Nome\.vcss_c") { throw "$($arq.Name) precisa incluir o CSS do mod" }
  [IO.File]::WriteAllBytes((Join-Path $stage "panorama\layout\$destino"), [S2Resource]::CompileXml($xml, $modeloXmlPequeno))
}
[IO.File]::WriteAllBytes((Join-Path $stage "panorama\scripts\$Nome.vts_c"), [S2Resource]::CompileJs($js, $modeloJs))
# Cópias legíveis, úteis para depurar.
[IO.File]::WriteAllText((Join-Path $build "$Nome.js"), $js, $utf8)
[IO.File]::WriteAllText((Join-Path $build "hud.xml"), $hud, $utf8)

$vpk = Join-Path $build ("pak{0:D2}_dir.vpk" -f $Pak)
[Vpk]::Pack($stage, $vpk)
Write-Host ("Pronto: {0} ({1:N0} bytes)" -f $vpk, (Get-Item $vpk).Length) -ForegroundColor Green
