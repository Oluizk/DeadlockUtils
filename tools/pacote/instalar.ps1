# Instala (ou remove, com -Remover) o Deadlock Utils no Deadlock. Não precisa compilar nada.
# Installs (or removes, with -Remover) Deadlock Utils. No build needed.
#  - habilita a pasta de addons no gameinfo.gi (com backup; atualizações do jogo desfazem isso, é só rodar de novo)
#    enables the addons folder in gameinfo.gi (with a backup; game updates undo it, just run this again)
#  - copia o .vpk para game\citadel\addons\ / copies the .vpk to game\citadel\addons\
param(
  [string]$Vpk = (Join-Path $PSScriptRoot "pak42_dir.vpk"),
  [string]$Jogo,
  [int]$Pak = 42,
  [switch]$Remover
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "achar-deadlock.ps1")

$Jogo = Find-Deadlock $Jogo
$citadel = Join-Path $Jogo "game\citadel"
$gameinfo = Join-Path $citadel "gameinfo.gi"
$addons = Join-Path $citadel "addons"
$nomeVpk = "pak{0:D2}_dir.vpk" -f $Pak
if (Get-Process -Name "deadlock" -ErrorAction SilentlyContinue) {
  Write-Host "Feche o Deadlock antes de instalar/remover o mod. / Close Deadlock before installing or removing the mod." -ForegroundColor Yellow
  exit 1
}

# Bloco original do gameinfo.gi e o bloco com addons (o mesmo usado pelos mods de HUD da comunidade).
$original = "(\r?\n)([ \t]*)Game[ \t]+citadel\r?\n[ \t]*Game[ \t]+core\r?\n"
$comAddons = @(
  "Game`t`t`t`tcitadel/addons",
  "Mod`t`t`t`tcitadel",
  "Write`t`t`t`tcitadel",
  "Game`t`t`t`tcitadel",
  "Mod`t`t`t`tcore",
  "Write`t`t`t`tcore",
  "Game`t`t`t`tcore"
)

$texto = [IO.File]::ReadAllText($gameinfo)
$temAddons = $texto -match "citadel/addons"

if ($Remover) {
  $alvo = Join-Path $addons $nomeVpk
  if (Test-Path $alvo) { Remove-Item $alvo -Force; Write-Host "Removido: $alvo" }
  $outros = @(Get-ChildItem $addons -Filter "*.vpk" -ErrorAction SilentlyContinue)
  if ($temAddons -and $outros.Count -eq 0) {
    $padrao = "(\r?\n)([ \t]*)Game[ \t]+citadel/addons\r?\n[ \t]*Mod[ \t]+citadel\r?\n[ \t]*Write[ \t]+citadel\r?\n[ \t]*Game[ \t]+citadel\r?\n[ \t]*Mod[ \t]+core\r?\n[ \t]*Write[ \t]+core\r?\n[ \t]*Game[ \t]+core\r?\n"
    $novo = [regex]::Replace($texto, $padrao, { param($m) $m.Groups[1].Value + $m.Groups[2].Value + "Game`t`t`t`tcitadel" + $m.Groups[1].Value + $m.Groups[2].Value + "Game`t`t`t`tcore" + $m.Groups[1].Value })
    [IO.File]::WriteAllText($gameinfo, $novo)
    Write-Host "gameinfo.gi voltou ao original (não há outros mods instalados)."
  } elseif ($outros.Count -gt 0) {
    Write-Host "Há outros mods em addons\: mantive a pasta de addons habilitada no gameinfo.gi."
  }
  # Teclas criadas pelo mod (bind ... panorama_dispatch_event DeadlockUtils_*): remove só essas linhas.
  $steam = (Get-ItemProperty "HKCU:\Software\Valve\Steam" -ErrorAction SilentlyContinue).SteamPath
  if ($steam) {
    foreach ($arq in Get-ChildItem (Join-Path $steam "userdata\*\1422450\local\cfg") -Filter "user_keys_*.vcfg" -ErrorAction SilentlyContinue) {
      $linhas = [IO.File]::ReadAllLines($arq.FullName)
      $novas = @($linhas | Where-Object { $_ -notmatch "DeadlockUtils_" })
      if ($novas.Count -ne $linhas.Count) {
        [IO.File]::WriteAllLines($arq.FullName, $novas)
        Write-Host "Teclas do mod removidas de $($arq.Name)."
      }
    }
  }
  Write-Host "Mod removido. / Mod removed." -ForegroundColor Green
  exit 0
}

if (-not (Test-Path $Vpk)) { throw "Não achei / not found: $Vpk" }

if (-not $temAddons) {
  $backup = "$gameinfo.antes-do-mod"
  Copy-Item $gameinfo $backup -Force
  $m = [regex]::Match($texto, $original)
  if (-not $m.Success) { throw "Formato do gameinfo.gi mudou; não sei onde habilitar os addons. Nada foi alterado." }
  $nl = $m.Groups[1].Value
  $ind = $m.Groups[2].Value
  $bloco = $nl + (($comAddons | ForEach-Object { $ind + $_ }) -join $nl) + $nl
  $texto = $texto.Substring(0, $m.Index) + $bloco + $texto.Substring($m.Index + $m.Length)
  [IO.File]::WriteAllText($gameinfo, $texto)
  Write-Host "gameinfo.gi: pasta de addons habilitada (backup em $backup)."
} else {
  Write-Host "gameinfo.gi já tem a pasta de addons habilitada."
}

New-Item -ItemType Directory -Force $addons | Out-Null
Copy-Item $Vpk (Join-Path $addons $nomeVpk) -Force
Write-Host "Instalado / Installed: $(Join-Path $addons $nomeVpk)" -ForegroundColor Green

$conflitos = Get-ChildItem $addons -Filter "*.vpk" | Where-Object { $_.Name -ne $nomeVpk }
if ($conflitos) {
  Write-Host "Outros mods encontrados em addons\: $($conflitos.Name -join ', ')" -ForegroundColor Yellow
  Write-Host "Se algum deles também substituir o HUD (hud.xml), um dos dois não vai funcionar." -ForegroundColor Yellow
  Write-Host "If one of them also replaces the HUD (hud.xml), one of the two will not work." -ForegroundColor Yellow
}

# Código de amigo da Steam (é a pasta em Steam\userdata que tem o Deadlock, 1422450): o jogador digita
# no jogo, em Configurações > Tracker. O mod não lê arquivos, por isso o instalador só mostra.
$steam = (Get-ItemProperty "HKCU:\Software\Valve\Steam" -ErrorAction SilentlyContinue).SteamPath
if ($steam) {
  $conta = Get-ChildItem (Join-Path $steam "userdata") -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName "1422450") } |
    Sort-Object { (Get-Item (Join-Path $_.FullName "1422450")).LastWriteTime } -Descending | Select-Object -First 1
  if ($conta) {
    Write-Host ""
    Write-Host "Seu código de amigo da Steam: $($conta.Name)" -ForegroundColor Cyan
    Write-Host "  Para o tracker: no jogo, loja (B) > Deadlock Utils > Configurações > Tracker."
    Write-Host "Your Steam friend code: $($conta.Name)" -ForegroundColor Cyan
    Write-Host "  For the tracker: in game, shop (B) > Deadlock Utils > Settings > Tracker."
  }
}
