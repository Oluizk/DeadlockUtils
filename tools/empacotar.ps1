# Monta os pacotes para publicar (GameBanana, Release do GitHub):
#   dist\DeadlockUtils-vX.Y.Z.zip            versão normal (pak42_dir.vpk)
#   dist\DeadlockUtils-QOL-Addon-vX.Y.Z.zip  addon para rodar junto com o QOL Lock (pak43_dir.vpk)
#   powershell -ExecutionPolicy Bypass -File tools\empacotar.ps1
# O mod é só o .vpk (é o que o Deadlock Mod Manager e os outros gerenciadores instalam com um clique).
# Cada zip leva o .vpk na raiz e um README.txt com a instalação manual. O .vpk sai SEM conta Steam
# (cada jogador informa a dele no jogo) e em inglês (o idioma é escolhido no jogo, em Configurações).
# No fim, refaz os builds locais para a sua instalação continuar com a sua conta.
param([string]$Jogo)
$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
$build = Join-Path $PSScriptRoot "build-mod.ps1"
$versao = [regex]::Match([IO.File]::ReadAllText($build), '\$VersaoMod = "([^"]+)"').Groups[1].Value
$dist = Join-Path $Raiz "dist"

# alvo, pasta do build, .vpk, nome do pacote, README do pacote
$pacotes = @(
  @{ Alvo = "normal"; Build = "build"; Vpk = "pak42_dir.vpk"; Nome = "DeadlockUtils-v$versao"; Leia = "README.txt" },
  @{ Alvo = "qol"; Build = "build\qol"; Vpk = "pak43_dir.vpk"; Nome = "DeadlockUtils-QOL-Addon-v$versao"; Leia = "README-qol.txt" }
)
foreach ($p in $pacotes) {
  & $build -Distribuicao -Alvo $p.Alvo -Jogo $Jogo
  if (-not $?) { throw "build de distribuição ($($p.Alvo)) falhou" }

  # Segurança: o script do pacote não pode levar a conta de quem compilou.
  $js = [IO.File]::ReadAllText((Join-Path $Raiz "$($p.Build)\deadlock_utils.js"), [Text.Encoding]::UTF8)
  if ($js -notmatch '"accountId":null') { throw "o build de distribuição ($($p.Alvo)) ficou com accountId gravado; pacote cancelado" }

  $pasta = Join-Path $dist $p.Nome
  if (Test-Path $pasta) { Remove-Item -Recurse -Force $pasta }
  New-Item -ItemType Directory -Force $pasta | Out-Null
  Copy-Item (Join-Path $Raiz "$($p.Build)\$($p.Vpk)") $pasta
  # README com a versão, em UTF-8 com BOM e CRLF (o Bloco de Notas mostra os acentos certo)
  $leia = [IO.File]::ReadAllText((Join-Path $PSScriptRoot "pacote\$($p.Leia)"), [Text.Encoding]::UTF8).Replace("{VERSAO}", $versao)
  $leia = ($leia -replace "`r?`n", "`r`n")
  [IO.File]::WriteAllText((Join-Path $pasta "README.txt"), $leia, (New-Object Text.UTF8Encoding $true))

  $zip = Join-Path $dist "$($p.Nome).zip"
  if (Test-Path $zip) { Remove-Item -Force $zip }
  Compress-Archive -Path (Join-Path $pasta "*") -DestinationPath $zip
  Write-Host ""
  Write-Host "Pacote pronto: $zip ($([math]::Round((Get-Item $zip).Length / 1KB)) KB)" -ForegroundColor Green
}

# Volta os builds locais ao normal (com a sua conta, para a sua instalação).
Write-Host ""
Write-Host "Refazendo os builds locais..."
& $build -Jogo $Jogo | Out-Null
& $build -Alvo qol -Jogo $Jogo | Out-Null
