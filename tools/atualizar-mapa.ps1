# Gera data/mapa.json (pontos de interesse do mapa) a partir de https://api.deadlock-api.com/v1/assets/map.
# Cada ponto vem com a posição RELATIVA na imagem do minimapa (0..1), a mesma imagem que o jogo desenha
# no #hud_minimap — por isso os pontos ficam exatamente em cima do mapa do jogo.
#   powershell -ExecutionPolicy Bypass -File tools\atualizar-mapa.ps1 [-Arquivo mapa.json]
param([string]$Arquivo)
$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false

if (-not $Arquivo) {
  $Arquivo = Join-Path $env:TEMP "deadlock_map.json"
  Write-Host "Baixando dados do mapa do deadlock-api.com..."
  Invoke-WebRequest -UseBasicParsing "https://api.deadlock-api.com/v1/assets/map" -OutFile $Arquivo
}
$m = [IO.File]::ReadAllText($Arquivo, [Text.Encoding]::UTF8) | ConvertFrom-Json

# Estilo parecido com o deadlocklabs.gg: "ponto" = bolinha colorida (caixas, estátuas);
# "icone" = ícone nativo do jogo dentro de um círculo escuro com borda na cor da camada.
# tam = px num mapa de 900. icone = caminho em panorama/images/ (todos existem no VPK do jogo).
$defs = @(
  @{ id = "caixas";     nome = "Caixas"; desc = "Quebre para ganhar almas e às vezes um bônus.";                fonte = "crates";          estilo = "ponto"; cor = "#e8e8e8"; tam = 6;  icone = "";                                          padrao = $false },
  @{ id = "resistentes";nome = "Caixas resistentes"; desc = "Caixas que aguentam mais dano e dão mais almas.";    fonte = "tough_crates";    estilo = "ponto"; cor = "#ff6f8e"; tam = 8;  icone = "";                                          padrao = $true },
  @{ id = "estatuas";   nome = "Estátuas douradas"; desc = "Bata nela para ganhar um bônus permanente.";     fonte = "golden_statues";  estilo = "ponto"; cor = "#ffa43a"; tam = 7;  icone = "";                                          padrao = $true },
  @{ id = "lanches";    nome = "Lanches de cura"; desc = "Cura rápida: pegue ao passar.";       fonte = "healing_snacks";  estilo = "icone"; cor = "#52d273"; tam = 24; icone = "minimap/health_pad_psd.vtex";               padrao = $true },
  @{ id = "ponte";      nome = "Buffs da ponte"; desc = "Buff temporário que surge na ponte (a cada 5 min a partir dos 5:00).";        fonte = "bridge_buffs";    estilo = "icone"; cor = "#ff9d2e"; tam = 30; icone = "minimap/powerup_souls_png.vtex";            padrao = $true },
  @{ id = "fendas";     nome = "Fendas instáveis"; desc = "";      fonte = "unstable_rifts";  estilo = "icone"; cor = "#c77dff"; tam = 28; icone = "minimap/rejuv_crystal_psd.vtex";            padrao = $true },
  @{ id = "sinos";      nome = "Sinos (torre)"; desc = "";         fonte = "bells";           estilo = "icone"; cor = "#ffd34d"; tam = 26; icone = "hud/abilities/doorman/doorman_bell_psd.vtex"; padrao = $true },
  @{ id = "veus";       nome = "Véus cósmicos"; desc = "Cortina que esconde quem está atrás dela.";         fonte = "cosmic_veils";    estilo = "icone"; cor = "#a78bfa"; tam = 22; icone = "icons/icon_eye.vsvg";                       padrao = $true },
  @{ id = "saltos";     nome = "Plataformas de salto"; desc = "Plataforma que lança você para cima.";  fonte = "bounce_pads";     estilo = "icone"; cor = "#5fd4ff"; tam = 22; icone = "hud/abilities/astro/bounce_pad_psd.vtex";   padrao = $false },
  @{ id = "vapor";      nome = "Dutos de vapor"; desc = "";        fonte = "steam_vents";     estilo = "icone"; cor = "#dfe6ee"; tam = 20; icone = "minimap/powerup_movement.vsvg";             padrao = $false },
  @{ id = "cordas";     nome = "Cordas de escalada"; desc = "Corda para subir no telhado.";    fonte = "climb_ropes";     estilo = "icone"; cor = "#b0a48c"; tam = 20; icone = "hud/ledge_climb_psd.vtex";                  padrao = $false },
  @{ id = "teleportes"; nome = "Teleportes"; desc = "Teleporte entre as rotas.";            fonte = "teleporters";     estilo = "icone"; cor = "#4da3ff"; tam = 24; icone = "minimap/minimap_teleporter_highlight.vsvg"; padrao = $false },
  @{ id = "lojas";      nome = "Lojas"; desc = "Loja secundária: compre itens fora da base.";                 fonte = "shops";           estilo = "icone"; cor = "#ff9d2e"; tam = 24; icone = "minimap/shop_psd.vtex";                     padrao = $false },
  @{ id = "urna";       nome = "Urna (surgimento)"; desc = "Onde a urna de almas aparece.";     fonte = "soul_urn_spawns"; estilo = "icone"; cor = "#3fd0d4"; tam = 24; icone = "minimap/soul_jar_marker_psd.vtex";          padrao = $false },
  @{ id = "urnaentrega";nome = "Urna (entrega)"; desc = "Leve a urna até aqui para entregar ao seu time.";        fonte = "soul_urn_pads";   estilo = "icone"; cor = "#3fd0d4"; tam = 24; icone = "minimap/soul_jar_marker_return_psd.vtex";   padrao = $false },
  @{ id = "sentinelas"; nome = "Sentinelas da base"; desc = "Sentinelas que defendem a base.";    fonte = "base_sentries";   estilo = "icone"; cor = "#ff5a5a"; tam = 20; icone = "minimap/npc_tower_enemy_psd.vtex";          padrao = $false }
)
$campos = @(
  @{ id = "camp_fraco";  nome = "Acampamentos pequenos"; desc = "Acampamento de monstros fácil."; kind = "weak";   cor = "#5fb9a5"; icone = "minimap/neutral_small_psd.vtex";  tam = 22 },
  @{ id = "camp_medio";  nome = "Acampamentos médios"; desc = "Acampamento de monstros médio.";   kind = "medium"; cor = "#5fb9a5"; icone = "minimap/neutral_medium_psd.vtex"; tam = 24 },
  @{ id = "camp_forte";  nome = "Acampamentos grandes"; desc = "Acampamento de monstros difícil, mais almas.";  kind = "strong"; cor = "#e0a33a"; icone = "minimap/neutral_large_psd.vtex";  tam = 26 },
  @{ id = "camp_cofre";  nome = "Cofres"; desc = "Cofre: acampamento com recompensa extra.";                kind = "vault";  cor = "#e0a33a"; icone = "minimap/neutral_vault_psd.vtex";  tam = 24 }
)
$imagens = @()

function Pontos($lista) {
  $out = foreach ($e in @($lista)) { if ($null -ne $e.left_relative) { "[" + ([math]::Round([double]$e.left_relative, 4)).ToString([Globalization.CultureInfo]::InvariantCulture) + "," + ([math]::Round([double]$e.top_relative, 4)).ToString([Globalization.CultureInfo]::InvariantCulture) + "]" } }
  "[" + ($out -join ",") + "]"
}
function Camada($d, $padrao, $pontos) {
  "    { `"id`": `"$($d.id)`", `"nome`": `"$($d.nome)`", `"desc`": `"$($d.desc)`", `"estilo`": `"$($d.estilo)`", `"cor`": `"$($d.cor)`", `"icone`": `"$($d.icone)`", `"tam`": $($d.tam), `"padrao`": $(if ($padrao) { 'true' } else { 'false' }), `"pontos`": $pontos }"
}

function Num([double]$v) { ([math]::Round($v, 4)).ToString([Globalization.CultureInfo]::InvariantCulture) }

# Túneis do Rem: não estão na API. Vêm das entidades citadel_tunnel_node do próprio mapa (dl_midtown.vpk),
# extraídas com o Source2Viewer CLI (tools/bin/s2v). Cada nó liga a até 3 outros; is_exit = entrada/saída.
function Tuneis([double]$raio) {
  $s2v = Join-Path $PSScriptRoot "bin\s2v\Source2Viewer-CLI.exe"
  if (-not (Test-Path $s2v)) { Write-Warning "Sem tools\bin\s2v\Source2Viewer-CLI.exe: camada dos túneis do Rem ficou de fora."; return $null }
  . (Join-Path $PSScriptRoot "jogo.ps1")
  $vpk = Join-Path (Find-Deadlock) "game\citadel\maps\dl_midtown.vpk"
  $tmp = Join-Path $env:TEMP "du_ents"
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  & $s2v -i $vpk -d -e "vents_c" -o $tmp | Out-Null
  $arq = Join-Path $tmp "maps\dl_midtown\entities\default_ents.vents"
  if (-not (Test-Path $arq)) { Write-Warning "Source2Viewer não gerou $arq"; return $null }
  $nos = @{}; $b = @{}
  $fechar = { if ($b.classname -eq '"citadel_tunnel_node"' -and $b.origin) { $nos[$b.targetname] = $b } }
  foreach ($l in [IO.File]::ReadLines($arq)) {
    if ($l.StartsWith("====")) { & $fechar; $b = @{}; continue }
    $i = $l.IndexOf(" ")
    if ($i -gt 0) { $b[$l.Substring(0, $i)] = $l.Substring($i).Trim() }
  }
  & $fechar
  $rel = { param($o) $v = $o.Trim("[ ]").Split(",") | ForEach-Object { [double]::Parse($_.Trim(), [Globalization.CultureInfo]::InvariantCulture) }; @((($v[0] + $raio) / (2 * $raio)), (($raio - $v[1]) / (2 * $raio))) }
  $vistos = @{}; $segs = @(); $saidas = @()
  foreach ($k in $nos.Keys) {
    $n = $nos[$k]; $a = & $rel $n.origin
    if ($n.is_exit -eq "true") { $saidas += "[" + (Num $a[0]) + "," + (Num $a[1]) + "]" }
    foreach ($c in "connecting_node_01", "connecting_node_02", "connecting_node_03") {
      $alvo = $n.$c
      if (-not $alvo -or $alvo -eq '""' -or -not $nos.ContainsKey($alvo)) { continue }
      $chave = (@($k, $alvo) | Sort-Object) -join "|"
      if ($vistos[$chave]) { continue }
      $vistos[$chave] = $true
      $z = & $rel $nos[$alvo].origin
      $segs += "[" + (Num $a[0]) + "," + (Num $a[1]) + "," + (Num $z[0]) + "," + (Num $z[1]) + "]"
    }
  }
  Write-Host "Túneis do Rem: $($nos.Count) nós, $($segs.Count) trechos, $($saidas.Count) entradas."
  "    { `"id`": `"tuneis`", `"nome`": `"Túneis do Rem`", `"desc`": `"Passagens subterrâneas do Rem. Pontilhado = caminho, ícone = entrada.`", `"estilo`": `"icone`", `"cor`": `"#7fd1ff`", `"icone`": `"heroes/familiar_mm_psd.vtex`", `"semCor`": true, `"tam`": 22, `"padrao`": true, `"pontos`": [" + ($saidas -join ",") + "], `"linhas`": [" + ($segs -join ",") + "] }"
}

$linhas = New-Object System.Collections.Generic.List[string]
foreach ($d in $defs) { $linhas.Add((Camada $d $d.padrao (Pontos $m.entities.($d.fonte)))) }
foreach ($c in $campos) { $c.estilo = "icone"; $linhas.Add((Camada $c $false (Pontos (@($m.neutral_camps) | Where-Object { $_.kind -eq $c.kind })))) }
$tun = Tuneis ([double]$m.radius)
if ($tun) { $linhas.Insert(3, $tun) }
$imgs = (@($imagens) | ForEach-Object { "    { `"id`": `"$($_.id)`", `"nome`": `"$($_.nome)`", `"imagem`": `"$($_.imagem)`", `"padrao`": $(if ($_.padrao) { 'true' } else { 'false' }) }" }) -join ",`n"

$json = "{`n  `"_info`": `"Gerado por tools/atualizar-mapa.ps1 (deadlock-api.com /v1/assets/map). Pontos: [x, y] relativos à imagem do minimapa (0..1).`",`n  `"raio`": $($m.radius),`n  `"camadas`": [`n" + ($linhas -join ",`n") + "`n  ],`n  `"imagens`": [`n$imgs`n  ]`n}`n"
[IO.File]::WriteAllText((Join-Path $Raiz "data\mapa.json"), $json, $utf8)
$total = 0; foreach ($l in $linhas) { $total += ([regex]::Matches($l, "\],\[").Count + 1) }
Write-Host "data\mapa.json: $($linhas.Count) camadas, ~$total pontos, $($imagens.Count) imagens." -ForegroundColor Green
