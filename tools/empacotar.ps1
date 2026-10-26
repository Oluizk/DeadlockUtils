# Monta o pacote para publicar (GameBanana, Release do GitHub): dist\DeadlockUtils-vX.Y.Z.zip
#   powershell -ExecutionPolicy Bypass -File tools\empacotar.ps1
# O mod é só o .vpk (é o que o Deadlock Mod Manager e os outros gerenciadores instalam com um clique).
# O zip leva o pak42_dir.vpk na raiz e um README.txt com a instalação manual. O .vpk sai SEM conta Steam
# (cada jogador informa a dele no jogo) e em inglês (o idioma é escolhido no jogo, em Configurações).
# No fim, refaz o build normal para a sua instalação local continuar com a sua conta.
param([string]$Jogo)
$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
$build = Join-Path $PSScriptRoot "build-mod.ps1"

& $build -Distribuicao -Jogo $Jogo
if (-not $?) { throw "build de distribuição falhou" }

# Segurança: o script do pacote não pode levar a conta de quem compilou.
$js = [IO.File]::ReadAllText((Join-Path $Raiz "build\deadlock_utils.js"), [Text.Encoding]::UTF8)
if ($js -notmatch '"accountId":null') { throw "o build de distribuição ficou com accountId gravado; pacote cancelado" }

$versao = [regex]::Match([IO.File]::ReadAllText($build), '\$VersaoMod = "([^"]+)"').Groups[1].Value
$nome = "DeadlockUtils-v$versao"
$dist = Join-Path $Raiz "dist"
$pasta = Join-Path $dist $nome
if (Test-Path $pasta) { Remove-Item -Recurse -Force $pasta }
New-Item -ItemType Directory -Force $pasta | Out-Null

Copy-Item (Join-Path $Raiz "build\pak42_dir.vpk") $pasta
# README com a versão, em UTF-8 com BOM e CRLF (o Bloco de Notas mostra os acentos certo)
$leia = [IO.File]::ReadAllText((Join-Path $PSScriptRoot "pacote\README.txt"), [Text.Encoding]::UTF8).Replace("{VERSAO}", $versao)
$leia = ($leia -replace "`r?`n", "`r`n")
[IO.File]::WriteAllText((Join-Path $pasta "README.txt"), $leia, (New-Object Text.UTF8Encoding $true))

$zip = Join-Path $dist "$nome.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $pasta "*") -DestinationPath $zip
Write-Host ""
Write-Host "Pacote pronto: $zip ($([math]::Round((Get-Item $zip).Length / 1KB)) KB)" -ForegroundColor Green

# Volta o build local ao normal (com a sua conta, para a sua instalação).
Write-Host ""
Write-Host "Refazendo o build local..."
& $build -Jogo $Jogo | Out-Null
