# Instala (ou remove, com -Remover) o mod no Deadlock.
#  - habilita a pasta de addons no gameinfo.gi (com backup; atualizações do jogo desfazem isso, é só rodar de novo)
#  - copia build\pakNN_dir.vpk para game\citadel\addons\
param(
  [string]$Jogo,
  [int]$Pak = 42,
  [switch]$Remover
)
. (Join-Path $PSScriptRoot "jogo.ps1")

$Jogo = Find-Deadlock $Jogo
$citadel = Join-Path $Jogo "game\citadel"
$gameinfo = Join-Path $citadel "gameinfo.gi"
$addons = Join-Path $citadel "addons"
$nomeVpk = "pak{0:D2}_dir.vpk" -f $Pak

if (Get-Process -Name "deadlock" -ErrorAction SilentlyContinue) {
  Write-Host "Feche o Deadlock antes de instalar/remover o mod." -ForegroundColor Yellow
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
  Write-Host "Mod removido." -ForegroundColor Green
  exit 0
}

$vpk = Join-Path $Raiz "build\$nomeVpk"
if (-not (Test-Path $vpk)) { throw "Não achei $vpk. Rode tools\build-mod.ps1 primeiro." }

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
Copy-Item $vpk (Join-Path $addons $nomeVpk) -Force
Write-Host "Instalado: $(Join-Path $addons $nomeVpk)" -ForegroundColor Green

$conflitos = Get-ChildItem $addons -Filter "*.vpk" | Where-Object { $_.Name -ne $nomeVpk }
if ($conflitos) {
  Write-Host "Outros mods encontrados em addons\: $($conflitos.Name -join ', ')" -ForegroundColor Yellow
  Write-Host "Se algum deles também substituir o HUD (hud.xml), um dos dois não vai funcionar." -ForegroundColor Yellow
}
