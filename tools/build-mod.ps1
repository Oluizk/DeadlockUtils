# Compila o mod do jogo: gera build\pakNN_dir.vpk com
#   panorama/layout/hud.vxml_c                 (hud.xml original + nosso script/estilo incluídos)
#   panorama/scripts/deadlock_utils.vts_c
#   panorama/styles/deadlock_utils.vcss_c
#   panorama/layout/deadlock_utils_<nome>.vxml_c   (mod/layout/<nome>.xml)
#
# -Alvo qol: o "Deadlock Utils - QOL Addon" (build\qol\pak43_dir.vpk), para rodar junto com o QOL Lock.
#   O QOL substitui hud.xml, placar, vida, loja e menu ESC; o addon não substitui nenhum arquivo dele:
#   entra pelo hud_playerintents.xml (script deadlock_utils_qol.vts_c) e vai sem mapa grande, vida, timers
#   e placar do topo (o QOL cuida disso; a mira e os pontos no minimapa ele não tem). Ver mod/src/02-compat.js.
#
#   powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 [-Jogo <pasta do Deadlock>] [-AtualizarHud] [-Alvo qol]
param(
  [string]$Jogo,
  [int]$Pak = 0,
  [switch]$AtualizarHud,
  # -Distribuicao: build para publicar (GameBanana, Release). NÃO grava a conta Steam de quem compilou;
  # cada jogador informa a dele no jogo (Configurações > Tracker).
  [switch]$Distribuicao,
  [ValidateSet("normal", "qol")][string]$Alvo = "normal"
)
. (Join-Path $PSScriptRoot "jogo.ps1")

$VersaoMod = "3.1.0"
$Nome = "deadlock_utils"
$Addon = $Alvo -eq "qol"
if (-not $Pak) { $Pak = if ($Addon) { 43 } else { 42 } }
# Onde o script entra e como ele se chama. O nome do script é diferente no addon: com as duas versões
# instaladas, cada layout carrega o seu (e 02-compat.js decide qual roda).
$Hospedeiro = if ($Addon) { "hud_playerintents" } else { "hud" }
$NomeScript = if ($Addon) { "$($Nome)_qol" } else { $Nome }
# Fora do addon: módulos do HUD (o QOL tem os dele) e os layouts que só eles usam.
# Só no addon: a aba "Deadlock Utils" na janela do QOL.
$ModulosSoNormal = @("50-mapa.js", "82-vida.js", "84-timers.js", "86-topo.js")
$LayoutsSoNormal = @("mapa", "marcas", "minitimers")
$ModulosSoAddon = @("78-qolaba.js")
$LayoutsSoAddon = @("qolaba", "qolbotao")
$ModulosFora = if ($Addon) { $ModulosSoNormal } else { $ModulosSoAddon }
$LayoutsFora = if ($Addon) { $LayoutsSoNormal } else { $LayoutsSoAddon }
$utf8 = New-Object Text.UTF8Encoding $false
function Ler([string]$rel) { [IO.File]::ReadAllText((Join-Path $Raiz $rel), [Text.Encoding]::UTF8).TrimStart([char]0xFEFF) }

$Jogo = Find-Deadlock $Jogo
$versaoJogo = Get-VersaoJogo $Jogo
Write-Host "Deadlock: $Jogo (versão $versaoJogo)"

# 0) As regras precisam estar válidas.
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "validar.ps1")
if ($LASTEXITCODE -ne 0) { throw "Corrija as regras antes de compilar." }

# 1) Layouts originais do jogo que o mod altera (mod/vendor/<nome>.xml). Precisam ser da MESMA versão do
#    jogo, senão o HUD quebra. O hospedeiro (hud.xml; no addon, hud_playerintents.xml) recebe o script e
#    o estilo do mod; os outros recebem os blocos de mod/jogo/<nome>.xml (ver o formato lá). O addon não
#    altera nenhum outro layout.
$LayoutsJogo = if ($Addon) { @($Hospedeiro) } else { @("hud", "citadel_hud_top_bar", "citadel_hud_top_bar_player", "hud_health") }
$LayoutsVendor = @("hud", "citadel_hud_top_bar", "citadel_hud_top_bar_player", "hud_health", "hud_playerintents")
$hudVersaoArq = Join-Path $Raiz "mod\vendor\hud.versao.txt"
if ($AtualizarHud) {
  Write-Host "Baixando os layouts atuais do GameTracking-Deadlock..."
  foreach ($n in $LayoutsVendor) {
    $url = "https://raw.githubusercontent.com/SteamTracking/GameTracking-Deadlock/master/game/citadel/pak01_dir/panorama/layout/$n.xml"
    [IO.File]::WriteAllText((Join-Path $Raiz "mod\vendor\$n.xml"), (Invoke-WebRequest -UseBasicParsing $url).Content, $utf8)
  }
  $urlInf = "https://raw.githubusercontent.com/SteamTracking/GameTracking-Deadlock/master/game/citadel/steam.inf"
  $inf = (Invoke-WebRequest -UseBasicParsing $urlInf).Content
  $v = ([regex]::Match($inf, "ClientVersion=(\d+)")).Groups[1].Value
  [IO.File]::WriteAllText($hudVersaoArq, $v, $utf8)
}
$versaoHud = ([IO.File]::ReadAllText($hudVersaoArq)).Trim()
if ($versaoHud -ne $versaoJogo) {
  Write-Host "ATENÇÃO: hud.xml do mod é da versão $versaoHud e o jogo está na $versaoJogo." -ForegroundColor Yellow
  Write-Host "         Rode com -AtualizarHud (quando o GameTracking já tiver o patch novo)." -ForegroundColor Yellow
}
$hud = Ler "mod\vendor\$Hospedeiro.xml"
$hud = [regex]::Replace($hud, "^\s*<!--.*?-->\s*", "", "Singleline")
if (-not $Addon -and $hud -notmatch "<CitadelHud") { throw "mod\vendor\hud.xml não parece o hud.xml do jogo." }
if ($Addon -and $hud -notmatch "PlayerIntentsContainer") { throw "mod\vendor\hud_playerintents.xml não parece o layout do jogo." }
$incEstilo = "<include src=`"s2r://panorama/styles/$Nome.vcss_c`" />"
$incScript = "<include src=`"s2r://panorama/scripts/$NomeScript.vts_c`" />"
$i = $hud.IndexOf("</styles>")
if ($i -lt 0) { throw "$Hospedeiro.xml sem </styles>" }
$hud = $hud.Insert($i, "`t$incEstilo`n`t")
if ($hud.Contains("</scripts>")) {
  $hud = $hud.Insert($hud.IndexOf("</scripts>"), "`t$incScript`n`t")
} else {
  $j = $hud.IndexOf("</styles>") + "</styles>".Length
  $hud = $hud.Insert($j, "`n`t<scripts>`n`t`t$incScript`n`t</scripts>")
}

# Aplica mod/jogo/<nome>.xml num layout do jogo. Diretivas (comentários):
#   <!-- DU:estilo <css> -->     inclui panorama/styles/<css>.vcss_c no fim dos <styles> do layout
#   <!-- DU:depois <trecho> -->  o bloco seguinte entra logo depois do trecho
#   <!-- DU:antes <trecho> -->   ... logo antes
#   <!-- DU:trocar <trecho> -->  ... no lugar do trecho
# No trecho, um espaço vale qualquer quantidade de espaço/quebra de linha. O trecho tem que existir uma
# vez só no original: se um patch do jogo mexer nele, o build para aqui (e não sai um HUD quebrado).
function Aplicar-Patch([string]$xml, [string]$nome) {
  $texto = Ler "mod\jogo\$nome.xml"
  $partes = [regex]::Split($texto, "<!--\s*DU:(estilo|depois|antes|trocar)\s+(.*?)\s*-->", "Singleline")
  for ($i = 1; $i -lt $partes.Count; $i += 3) {
    $tipo = $partes[$i]; $arg = $partes[$i + 1]
    $bloco = [regex]::Replace($partes[$i + 2], "<!--.*?-->", "", "Singleline").Trim("`r", "`n")
    if ($tipo -eq "estilo") {
      $bloco = "`t`t<include src=`"s2r://panorama/styles/$arg.vcss_c`" />"
      $tipo = "antes"; $arg = "</styles>"
    }
    $re = ([regex]::Escape($arg) -replace "(\\ )+", "\s+")
    $achados = [regex]::Matches($xml, $re)
    if ($achados.Count -ne 1) { throw "mod/jogo/$nome.xml: o trecho '$arg' aparece $($achados.Count) vez(es) no $nome.xml do jogo (o jogo mudou?)" }
    $m = $achados[0]
    if ($tipo -eq "trocar") { $xml = $xml.Remove($m.Index, $m.Length).Insert($m.Index, $bloco) }
    elseif ($tipo -eq "depois") { $xml = $xml.Insert($m.Index + $m.Length, "`n" + $bloco) }
    else { $xml = $xml.Insert($m.Index, $bloco + "`n") }
  }
  return $xml
}
$layoutsAlterados = @{}
foreach ($n in $LayoutsJogo | Where-Object { $_ -ne $Hospedeiro }) {
  $original = [regex]::Replace((Ler "mod\vendor\$n.xml"), "^\s*<!--.*?-->\s*", "", "Singleline")
  $layoutsAlterados[$n] = Aplicar-Patch $original $n
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
# Nome que o jogo mostra para cada item em cada idioma do mod (cartões, dicas, editor).
$arqIdioma = [ordered]@{ en = "english"; pt = "brazilian"; es = "spanish"; ru = "russian" }
$porIdioma = foreach ($i in $arqIdioma.Keys) {
  $mapa = @{}
  $arqLoc = Join-Path $locItens "citadel_gc_mod_names_$($arqIdioma[$i]).txt"
  if (Test-Path $arqLoc) {
    foreach ($linha in [IO.File]::ReadAllLines($arqLoc, [Text.Encoding]::UTF8)) {
      if ($linha -match '^\s*"(upgrade_[a-z0-9_]+)"\s+"([^"]+)"') {
        $id = $classeParaItem[$matches[1]]
        if ($id -and -not $mapa.ContainsKey($id)) { $mapa[$id] = $matches[2].Trim() }
      }
    }
  }
  "`"$i`":{" + (($mapa.GetEnumerator() | Sort-Object Name | ForEach-Object { '"' + $_.Name + '":"' + $_.Value.Replace('\', '\\').Replace('"', '\"') + '"' }) -join ",") + "}"
}
$nomesItensIdiomaJson = "{" + ($porIdioma -join ",") + "}"
Write-Host "Nomes de itens (todos os idiomas): $($nomesItens.Count)"
# ID de cada item no jogo (para abrir o tooltip nativo com CitadelShowModTooltip).
$idsJogoJson = "{" + (($itensDados | ForEach-Object { '"' + $_.id + '":' + [S2Hash]::Murmur2($_.classes[0]) }) -join ",") + "}"

# 3) Configuração: seu id Steam (SteamID3) é a pasta em Steam\userdata que tem o Deadlock (1422450).
$config = Ler "data\config.json" | ConvertFrom-Json
if ($Distribuicao) {
  $config.accountId = $null
  Write-Host "Build de distribuição: sem conta Steam gravada." -ForegroundColor Cyan
} elseif (-not $config.accountId) {
  $steam = (Get-ItemProperty "HKCU:\Software\Valve\Steam" -ErrorAction SilentlyContinue).SteamPath
  if ($steam) {
    $conta = Get-ChildItem (Join-Path $steam "userdata") -Directory -ErrorAction SilentlyContinue |
      Where-Object { Test-Path (Join-Path $_.FullName "1422450") } |
      Sort-Object { (Get-Item (Join-Path $_.FullName "1422450")).LastWriteTime } -Descending | Select-Object -First 1
    if ($conta) { $config.accountId = [long]$conta.Name; Write-Host "Conta Steam detectada: $($conta.Name)" }
  }
}
$configJson = $config | ConvertTo-Json -Depth 6 -Compress
# Idioma padrão do build: inglês (o instalador troca depois). data/config.json "idioma" muda isso no build local.
$idiomaBuild = if ($config.idioma -and @("en", "pt", "es", "ru") -contains $config.idioma) { $config.idioma } else { "en" }

# 4) Script: dados + motor + módulos do mod (mod/src/*.js em ordem), num arquivo só.
$arquivosRegras = Get-ChildItem (Join-Path $Raiz "data\rules") -Filter "*.json" |
  Where-Object { $_.Name -notin @("itens-inimigos.json", "counters-herois.json") } | Sort-Object Name
$regrasJs = ($arquivosRegras | ForEach-Object { Ler "data\rules\$($_.Name)" }) -join ",`n"
# Todos os módulos dividem o mesmo escopo: o mesmo nome em dois "var"/"function" de topo quebra o mod.
$arquivosSrc = Get-ChildItem (Join-Path $Raiz "mod\src") -Filter "*.js" | Sort-Object Name |
  Where-Object { $_.Name -notin $ModulosFora }
$nomesTopo = @{}
foreach ($arq in $arquivosSrc) {
  foreach ($m in [regex]::Matches((Ler "mod\src\$($arq.Name)"), "(?m)^(?:var|function) ([A-Za-z_$][\w$]*)")) {
    $n = $m.Groups[1].Value
    if ($nomesTopo.ContainsKey($n) -and $nomesTopo[$n] -ne $arq.Name) { throw "Nome '$n' declarado em $($nomesTopo[$n]) e em $($arq.Name)" }
    $nomesTopo[$n] = $arq.Name
  }
}
$modulos = ($arquivosSrc | ForEach-Object {
  "// ---------- mod/src/$($_.Name) ----------`n" + (Ler "mod\src\$($_.Name)")
}) -join "`n"
$js = @"
// Deadlock Utils v$VersaoMod, gerado por tools/build-mod.ps1. NÃO edite: edite mod/src/*.js e data/.
// O instalador troca as 2 letras depois do marcador pelo idioma escolhido (en, pt, es, ru).
var DU_IDIOMA = /*DU_IDIOMA*/"$idiomaBuild";
var DU_ALVO = "$Alvo";
var DU_DATA = {
versao: "$VersaoMod",
versaoJogo: "$versaoJogo",
config: $configJson,
items: $(Ler "data\items.json"),
heroes: $(Ler "data\heroes.json"),
builds: $(Ler "data\builds.json"),
mapa: $(Ler "data\mapa.json"),
textos: $(Ler "data\textos.json"),
detalhesItens: $(Ler "data\itens-detalhes.json"),
countersHerois: $(Ler "data\rules\counters-herois.json"),
ameacas: $(Ler "data\rules\itens-inimigos.json"),
regrasArquivos: [
$regrasJs
],
nomesHerois: $nomesJson,
nomesItens: $nomesItensJson,
nomesItensIdioma: $nomesItensIdiomaJson,
idsJogo: $idsJogoJson
};
$(Ler "app\engine.js")
(function () {
"use strict";
$modulos
})();
"@
# 5) CSS: o Panorama não entende alguns seletores e um CSS inválido derruba o HUD inteiro.
# Os @define do jogo (offWhite, block, oracle...) só valem dentro do arquivo do jogo que os cria: no CSS
# do mod viram valor inválido em silêncio (fonte padrão, cor errada). O build recusa.
function Validar-Css([string]$arquivo, [string]$texto) {
  $semComentarios = [regex]::Replace($texto, "/\*.*?\*/", "", "Singleline")
  foreach ($m in [regex]::Matches($semComentarios, "([^{}]*)\{")) {
    $sel = $m.Groups[1].Value
    if ($sel.Trim().StartsWith("0%") -or $sel.Trim().StartsWith("50%") -or $sel.Trim().StartsWith("100%")) { continue }
    if ($sel -match "[+~]" -or $sel -match "::|:(not|is|where|has|nth-[a-z-]+)\(") { throw "$arquivo : seletor não suportado pelo Panorama: '$($sel.Trim())'" }
  }
  $apelido = [regex]::Match($semComentarios, ":\s*(offWhite|offBlack|block|oracle|numericBlock|numericOracle|colorEnemy|team1Color|team2Color)\s*[;,]")
  if ($apelido.Success) { throw "$arquivo : '$($apelido.Groups[1].Value)' é um @define do jogo e não vale no CSS do mod; use o valor (ver mod/jogo/topo.css)" }
  $abre = ([regex]::Matches($semComentarios, "\{")).Count; $fecha = ([regex]::Matches($semComentarios, "\}")).Count
  if ($abre -ne $fecha) { throw "$arquivo : chaves desbalanceadas ({ $abre, } $fecha)" }
}
$css = Ler "mod\estilo.css"
Validar-Css "mod/estilo.css" $css
$cssJogo = @{}
foreach ($arq in Get-ChildItem (Join-Path $Raiz "mod\jogo") -Filter "*.css" | Where-Object { -not $Addon }) {
  $cssJogo[$arq.BaseName] = Ler "mod\jogo\$($arq.Name)"
  Validar-Css "mod/jogo/$($arq.Name)" $cssJogo[$arq.BaseName]
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
$modeloXml = Modelo "panorama/layout/$Hospedeiro.vxml_c"
$modeloXmlPequeno = Modelo "panorama/layout/citadel_hud_top_bar_team.vxml_c"
$modeloCss = Modelo "panorama/styles/hud.vcss_c"
$modeloJs = Modelo "panorama/scripts/async.vts_c"

# 7) Compila e empacota (o addon em build\qol, para não misturar com a versão normal).
$build = if ($Addon) { Join-Path $Raiz "build\qol" } else { Join-Path $Raiz "build" }
$stage = Join-Path $build "stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
foreach ($d in "panorama\layout", "panorama\scripts", "panorama\styles", "panorama\images\$Nome") { New-Item -ItemType Directory -Force (Join-Path $stage $d) | Out-Null }
[IO.File]::WriteAllBytes((Join-Path $stage "panorama\layout\$Hospedeiro.vxml_c"), [S2Resource]::CompileXml($hud, $modeloXml))
[IO.File]::WriteAllBytes((Join-Path $stage "panorama\styles\$Nome.vcss_c"), [S2Resource]::CompileCss($css, $modeloCss))
# Layouts do jogo alterados (modelo = o próprio arquivo original) e os CSS que entram neles.
foreach ($n in $layoutsAlterados.Keys) {
  [IO.File]::WriteAllBytes((Join-Path $stage "panorama\layout\$n.vxml_c"), [S2Resource]::CompileXml($layoutsAlterados[$n], (Modelo "panorama/layout/$n.vxml_c")))
  [IO.File]::WriteAllText((Join-Path $build "$n.xml"), $layoutsAlterados[$n], $utf8)
}
foreach ($c in $cssJogo.Keys) {
  [IO.File]::WriteAllBytes((Join-Path $stage "panorama\styles\$($Nome)_$c.vcss_c"), [S2Resource]::CompileCss($cssJogo[$c], $modeloCss))
}
# Imagens: mod/imagens/<x>.png -> panorama/images/deadlock_utils/<x>_png.vtex_c (s2r://panorama/images/deadlock_utils/<x>_png.vtex)
$modeloTextura = Modelo "panorama/images/icons/logo_deadlock_word_only_png.vtex_c"
foreach ($arq in Get-ChildItem (Join-Path $Raiz "mod\imagens") -Filter "*.png") {
  $png = [IO.File]::ReadAllBytes($arq.FullName)
  [IO.File]::WriteAllBytes((Join-Path $stage "panorama\images\$Nome\$($arq.BaseName)_png.vtex_c"), [S2Resource]::CompileTexturePng($png, $modeloTextura))
}
# Layouts próprios: mod/layout/<x>.xml -> panorama/layout/deadlock_utils_<x>.vxml_c
foreach ($arq in Get-ChildItem (Join-Path $Raiz "mod\layout") -Filter "*.xml" | Where-Object { $_.BaseName -notin $LayoutsFora }) {
  $destino = "{0}_{1}.vxml_c" -f $Nome, $arq.BaseName
  $xml = Ler "mod\layout\$($arq.Name)"
  if ($xml -notmatch "$Nome\.vcss_c") { throw "$($arq.Name) precisa incluir o CSS do mod" }
  [IO.File]::WriteAllBytes((Join-Path $stage "panorama\layout\$destino"), [S2Resource]::CompileXml($xml, $modeloXmlPequeno))
}
[IO.File]::WriteAllBytes((Join-Path $stage "panorama\scripts\$NomeScript.vts_c"), [S2Resource]::CompileJs($js, $modeloJs))
# Cópias legíveis, úteis para depurar (o simulador, test/hud-simulado.html, lê o .js daqui).
[IO.File]::WriteAllText((Join-Path $build "$Nome.js"), $js, $utf8)
[IO.File]::WriteAllText((Join-Path $build "$Hospedeiro.xml"), $hud, $utf8)

$vpk = Join-Path $build ("pak{0:D2}_dir.vpk" -f $Pak)
[Vpk]::Pack($stage, $vpk)
Write-Host ("Pronto: {0} ({1:N0} bytes)" -f $vpk, (Get-Item $vpk).Length) -ForegroundColor Green
