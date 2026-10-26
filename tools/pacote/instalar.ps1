# Instala (ou remove, com -Remover) o Deadlock Utils no Deadlock. Não precisa compilar nada.
# Installs (or removes, with -Remover) Deadlock Utils. No build needed.
#  - pergunta o idioma do mod (en, pt, es, ru; Enter = o atual ou inglês) e grava no .vpk instalado
#    asks for the mod language and writes it into the installed .vpk
#  - habilita a pasta de addons no gameinfo.gi (com backup; atualizações do jogo desfazem isso, é só rodar de novo)
#    enables the addons folder in gameinfo.gi (with a backup; game updates undo it, just run this again)
#  - copia o .vpk para game\citadel\addons\ / copies the .vpk to game\citadel\addons\
# Este arquivo precisa ficar em UTF-8 COM BOM (o PowerShell 5.1 lê sem BOM como ANSI e estraga o russo).
param(
  [string]$Vpk = (Join-Path $PSScriptRoot "pak42_dir.vpk"),
  [string]$Jogo,
  [int]$Pak = 42,
  [switch]$Remover,
  [ValidateSet("", "en", "pt", "es", "ru")][string]$Idioma = ""
)
$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {} # acentos e russo no console
. (Join-Path $PSScriptRoot "achar-deadlock.ps1")

# ---------- textos do instalador ----------
$IDIOMAS = [ordered]@{ en = "English (en-US)"; pt = "Português (pt-BR)"; es = "Español (es-ES)"; ru = "Русский (ru-RU)" }
$TXT = @{
  en = @{
    titulo = "Deadlock Utils {0}: installer"
    tituloRemover = "Deadlock Utils: uninstall"
    idiomaOk = "Language: {0}"
    fecheJogo = "Close Deadlock before installing or removing the mod."
    naoAchouJogo = "Could not find Deadlock. Run again with: install.bat -Jogo `"C:\path\to\steamapps\common\Deadlock`""
    naoAchouVpk = "File not found: {0}. Extract the whole .zip before running install.bat."
    formatoMudou = "gameinfo.gi has a format this installer does not know. Nothing was changed."
    giHabilitado = "gameinfo.gi: mods folder enabled (backup at {0})."
    giJa = "gameinfo.gi already has the mods folder enabled."
    instalado = "Installed: {0}"
    outros = "Other mods found in addons\: {0}"
    conflito = "If one of them also replaces the HUD (hud.xml), one of the two will not work."
    codigo = "Your Steam friend code: {0}"
    codigoDica = "  For the tracker: in game, shop (B) > Deadlock Utils > Settings > Tracker."
    pronto = "Done! Open Deadlock. Shop (B): Deadlock Utils tab. Hold Tab: recommended items. M: map. F6: tracker. F8: turns the mod on/off."
    reinstalar = "After a Deadlock update, if the mod disappears, run install.bat again."
    removidoArq = "Removed: {0}"
    giOriginal = "gameinfo.gi is back to the original (no other mods installed)."
    giMantido = "There are other mods in addons\: the mods folder stays enabled in gameinfo.gi."
    teclas = "Mod hotkeys removed from {0}."
    removido = "Mod removed."
    erro = "Something went wrong: {0}"
  }
  pt = @{
    titulo = "Deadlock Utils {0}: instalador"
    tituloRemover = "Deadlock Utils: desinstalar"
    idiomaOk = "Idioma: {0}"
    fecheJogo = "Feche o Deadlock antes de instalar ou remover o mod."
    naoAchouJogo = "Não achei o Deadlock. Rode de novo com: install.bat -Jogo `"C:\caminho\para\steamapps\common\Deadlock`""
    naoAchouVpk = "Arquivo não encontrado: {0}. Extraia o .zip inteiro antes de rodar o install.bat."
    formatoMudou = "O gameinfo.gi está num formato que o instalador não conhece. Nada foi alterado."
    giHabilitado = "gameinfo.gi: pasta de mods habilitada (backup em {0})."
    giJa = "O gameinfo.gi já tem a pasta de mods habilitada."
    instalado = "Instalado: {0}"
    outros = "Outros mods encontrados em addons\: {0}"
    conflito = "Se algum deles também substituir o HUD (hud.xml), um dos dois não vai funcionar."
    codigo = "Seu código de amigo da Steam: {0}"
    codigoDica = "  Para o tracker: no jogo, loja (B) > Deadlock Utils > Configurações > Tracker."
    pronto = "Pronto! Abra o Deadlock. Loja (B): aba Deadlock Utils. Segure Tab: itens recomendados. M: mapa. F6: tracker. F8: liga/desliga o mod."
    reinstalar = "Depois de uma atualização do Deadlock, se o mod sumir, rode o install.bat de novo."
    removidoArq = "Removido: {0}"
    giOriginal = "O gameinfo.gi voltou ao original (não há outros mods instalados)."
    giMantido = "Há outros mods em addons\: a pasta de mods continua habilitada no gameinfo.gi."
    teclas = "Teclas do mod removidas de {0}."
    removido = "Mod removido."
    erro = "Algo deu errado: {0}"
  }
  es = @{
    titulo = "Deadlock Utils {0}: instalador"
    tituloRemover = "Deadlock Utils: desinstalar"
    idiomaOk = "Idioma: {0}"
    fecheJogo = "Cierra Deadlock antes de instalar o quitar el mod."
    naoAchouJogo = "No se encontró Deadlock. Vuelve a ejecutarlo con: install.bat -Jogo `"C:\ruta\a\steamapps\common\Deadlock`""
    naoAchouVpk = "No se encontró el archivo: {0}. Extrae el .zip completo antes de ejecutar install.bat."
    formatoMudou = "gameinfo.gi tiene un formato que el instalador no conoce. No se cambió nada."
    giHabilitado = "gameinfo.gi: carpeta de mods activada (copia de seguridad en {0})."
    giJa = "gameinfo.gi ya tiene la carpeta de mods activada."
    instalado = "Instalado: {0}"
    outros = "Otros mods encontrados en addons\: {0}"
    conflito = "Si alguno de ellos también reemplaza el HUD (hud.xml), uno de los dos no funcionará."
    codigo = "Tu código de amigo de Steam: {0}"
    codigoDica = "  Para el tracker: en el juego, tienda (B) > Deadlock Utils > Ajustes > Tracker."
    pronto = "¡Listo! Abre Deadlock. Tienda (B): pestaña Deadlock Utils. Mantén Tab: objetos recomendados. M: mapa. F6: tracker. F8: activa/desactiva el mod."
    reinstalar = "Tras una actualización de Deadlock, si el mod desaparece, vuelve a ejecutar install.bat."
    removidoArq = "Eliminado: {0}"
    giOriginal = "gameinfo.gi ha vuelto al original (no hay otros mods instalados)."
    giMantido = "Hay otros mods en addons\: la carpeta de mods sigue activada en gameinfo.gi."
    teclas = "Teclas del mod eliminadas de {0}."
    removido = "Mod eliminado."
    erro = "Algo salió mal: {0}"
  }
  ru = @{
    titulo = "Deadlock Utils {0}: установка"
    tituloRemover = "Deadlock Utils: удаление"
    idiomaOk = "Язык: {0}"
    fecheJogo = "Закройте Deadlock перед установкой или удалением мода."
    naoAchouJogo = "Deadlock не найден. Запустите снова так: install.bat -Jogo `"C:\путь\к\steamapps\common\Deadlock`""
    naoAchouVpk = "Файл не найден: {0}. Распакуйте весь .zip перед запуском install.bat."
    formatoMudou = "Формат gameinfo.gi незнаком установщику. Ничего не изменено."
    giHabilitado = "gameinfo.gi: папка модов включена (резервная копия: {0})."
    giJa = "В gameinfo.gi папка модов уже включена."
    instalado = "Установлено: {0}"
    outros = "В addons\ найдены другие моды: {0}"
    conflito = "Если какой-то из них тоже заменяет HUD (hud.xml), один из двух не будет работать."
    codigo = "Ваш код друга в Steam: {0}"
    codigoDica = "  Для трекера: в игре, лавка (B) > Deadlock Utils > Настройки > Трекер."
    pronto = "Готово! Запустите Deadlock. Лавка (B): вкладка Deadlock Utils. Удерживайте Tab: рекомендуемые предметы. M: карта. F6: трекер. F8: вкл/выкл мод."
    reinstalar = "Если после обновления Deadlock мод пропадёт, снова запустите install.bat."
    removidoArq = "Удалено: {0}"
    giOriginal = "gameinfo.gi возвращён к исходному (других модов нет)."
    giMantido = "В addons\ есть другие моды: папка модов в gameinfo.gi остаётся включённой."
    teclas = "Клавиши мода удалены из {0}."
    removido = "Мод удалён."
    erro = "Что-то пошло не так: {0}"
  }
}
$script:lang = "en"
function L([string]$chave) {
  $s = $TXT[$script:lang][$chave]
  if (-not $s) { $s = $TXT.en[$chave] }
  if ($args.Count) { $s = $s -f $args }
  return $s
}

# ---------- idioma gravado no .vpk ----------
# O script do mod tem /*DU_IDIOMA*/"en" (tools/build-mod.ps1). Trocamos as 2 letras e corrigimos o CRC
# do arquivo dentro do VPK (o tamanho não muda).
$MARCADOR = '/*DU_IDIOMA*/"'
$latin1 = [Text.Encoding]::GetEncoding(28591) # 1 byte = 1 caractere, para achar o marcador nos bytes
function IdiomaDoVpk([string]$arq) {
  if (-not (Test-Path $arq)) { return "" }
  $txt = $latin1.GetString([IO.File]::ReadAllBytes($arq))
  $i = $txt.IndexOf($MARCADOR)
  if ($i -lt 0) { return "" }
  return $txt.Substring($i + $MARCADOR.Length, 2)
}
function VersaoDoVpk([string]$arq) {
  if (-not (Test-Path $arq)) { return "" }
  $m = [regex]::Match($latin1.GetString([IO.File]::ReadAllBytes($arq)), "Deadlock Utils v([0-9.]+)")
  if ($m.Success) { return "v" + $m.Groups[1].Value } else { return "" }
}

if (-not ("DUCrc" -as [type])) {
  Add-Type -TypeDefinition @"
public static class DUCrc {
  static uint[] t;
  public static uint Calc(byte[] d, int ini, int n) {
    if (t == null) { t = new uint[256]; for (uint i = 0; i < 256; i++) { uint c = i; for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320 ^ (c >> 1) : c >> 1; t[i] = c; } }
    uint crc = 0xFFFFFFFF;
    for (int i = ini; i < ini + n; i++) crc = t[(crc ^ d[i]) & 0xFF] ^ (crc >> 8);
    return crc ^ 0xFFFFFFFF;
  }
}
"@
}

function GravarIdioma([string]$arq, [string]$codigo) {
  $b = [IO.File]::ReadAllBytes($arq)
  $pos = $latin1.GetString($b).IndexOf($MARCADOR)
  if ($pos -lt 0) { return $false }
  $pos += $MARCADOR.Length
  $novo = [Text.Encoding]::ASCII.GetBytes($codigo)
  $b[$pos] = $novo[0]; $b[$pos + 1] = $novo[1]
  # Diretório do VPK v2: acha a entrada cujo conteúdo contém o marcador e recalcula o CRC dela.
  $r = New-Object IO.BinaryReader (New-Object IO.MemoryStream (, $b))
  if ($r.ReadUInt32() -ne 0x55AA1234) { throw "VPK?" }
  $versao = $r.ReadUInt32(); $tamArvore = $r.ReadUInt32()
  if ($versao -eq 2) { [void]$r.ReadBytes(16) }
  $fimArvore = $(if ($versao -eq 2) { 28 } else { 12 }) + $tamArvore
  function CStr { $l = New-Object Collections.Generic.List[byte]; while (($c = $r.ReadByte()) -ne 0) { $l.Add($c) }; return [Text.Encoding]::UTF8.GetString($l.ToArray()) }
  $achou = $false
  while ((CStr) -ne "") {
    while ((CStr) -ne "") {
      while ((CStr) -ne "") {
        $posCrc = $r.BaseStream.Position
        [void]$r.ReadUInt32(); $preload = $r.ReadUInt16(); $indice = $r.ReadUInt16()
        $ofs = $r.ReadUInt32(); $tam = $r.ReadUInt32(); [void]$r.ReadUInt16(); [void]$r.ReadBytes($preload)
        $ini = $fimArvore + $ofs
        if ($indice -eq 0x7FFF -and $preload -eq 0 -and $pos -ge $ini -and $pos -lt $ini + $tam) {
          [BitConverter]::GetBytes([DUCrc]::Calc($b, [int]$ini, [int]$tam)).CopyTo($b, [int]$posCrc)
          $achou = $true
        }
      }
    }
  }
  if (-not $achou) { return $false }
  [IO.File]::WriteAllBytes($arq, $b)
  return $true
}

function EscolherIdioma([string]$atual) {
  $codigos = @($IDIOMAS.Keys)
  $padrao = [Math]::Max(0, $codigos.IndexOf($(if ($atual) { $atual } else { "en" })))
  Write-Host ""
  for ($i = 0; $i -lt $codigos.Count; $i++) {
    $marca = $(if ($i -eq $padrao) { "  <" } else { "" })
    Write-Host ("  {0}. {1}{2}" -f ($i + 1), $IDIOMAS[$codigos[$i]], $marca)
  }
  Write-Host ""
  $resp = Read-Host ("Language / Idioma / Язык [1-4, Enter = {0}]" -f ($padrao + 1))
  $n = 0
  if ([int]::TryParse(("" + $resp).Trim(), [ref]$n) -and $n -ge 1 -and $n -le $codigos.Count) { return $codigos[$n - 1] }
  return $codigos[$padrao]
}

# ---------- principal ----------
try {
  if (Get-Process -Name "deadlock" -ErrorAction SilentlyContinue) {
    Write-Host (L fecheJogo) -ForegroundColor Yellow
    exit 1
  }
  try { $Jogo = Find-Deadlock $Jogo } catch { Write-Host (L naoAchouJogo) -ForegroundColor Red; exit 1 }
  $citadel = Join-Path $Jogo "game\citadel"
  $gameinfo = Join-Path $citadel "gameinfo.gi"
  $addons = Join-Path $citadel "addons"
  $nomeVpk = "pak{0:D2}_dir.vpk" -f $Pak
  $instalado = Join-Path $addons $nomeVpk
  $idiomaAtual = IdiomaDoVpk $instalado
  if ($idiomaAtual -and $IDIOMAS.Contains($idiomaAtual)) { $script:lang = $idiomaAtual }

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
    Write-Host (L tituloRemover) -ForegroundColor Cyan
    if (Test-Path $instalado) { Remove-Item $instalado -Force; Write-Host (L removidoArq $instalado) }
    $outros = @(Get-ChildItem $addons -Filter "*.vpk" -ErrorAction SilentlyContinue)
    if ($temAddons -and $outros.Count -eq 0) {
      $padrao = "(\r?\n)([ \t]*)Game[ \t]+citadel/addons\r?\n[ \t]*Mod[ \t]+citadel\r?\n[ \t]*Write[ \t]+citadel\r?\n[ \t]*Game[ \t]+citadel\r?\n[ \t]*Mod[ \t]+core\r?\n[ \t]*Write[ \t]+core\r?\n[ \t]*Game[ \t]+core\r?\n"
      $novo = [regex]::Replace($texto, $padrao, { param($m) $m.Groups[1].Value + $m.Groups[2].Value + "Game`t`t`t`tcitadel" + $m.Groups[1].Value + $m.Groups[2].Value + "Game`t`t`t`tcore" + $m.Groups[1].Value })
      [IO.File]::WriteAllText($gameinfo, $novo)
      Write-Host (L giOriginal)
    } elseif ($outros.Count -gt 0) {
      Write-Host (L giMantido)
    }
    # Teclas criadas pelo mod (bind ... panorama_dispatch_event DeadlockUtils_*): remove só essas linhas.
    $steam = (Get-ItemProperty "HKCU:\Software\Valve\Steam" -ErrorAction SilentlyContinue).SteamPath
    if ($steam) {
      foreach ($arq in Get-ChildItem (Join-Path $steam "userdata\*\1422450\local\cfg") -Filter "user_keys_*.vcfg" -ErrorAction SilentlyContinue) {
        $linhas = [IO.File]::ReadAllLines($arq.FullName)
        $novas = @($linhas | Where-Object { $_ -notmatch "DeadlockUtils_" })
        if ($novas.Count -ne $linhas.Count) {
          [IO.File]::WriteAllLines($arq.FullName, $novas)
          Write-Host (L teclas $arq.Name)
        }
      }
    }
    Write-Host (L removido) -ForegroundColor Green
    exit 0
  }

  if (-not (Test-Path $Vpk)) { Write-Host (L naoAchouVpk $Vpk) -ForegroundColor Red; exit 1 }
  Write-Host (L titulo (VersaoDoVpk $Vpk)) -ForegroundColor Cyan
  if (-not $Idioma) { $Idioma = EscolherIdioma $idiomaAtual }
  $script:lang = $Idioma
  Write-Host (L idiomaOk $IDIOMAS[$Idioma])
  Write-Host ""

  if (-not $temAddons) {
    $backup = "$gameinfo.antes-do-mod"
    $m = [regex]::Match($texto, $original)
    if (-not $m.Success) { Write-Host (L formatoMudou) -ForegroundColor Red; exit 1 }
    Copy-Item $gameinfo $backup -Force
    $nl = $m.Groups[1].Value
    $ind = $m.Groups[2].Value
    $bloco = $nl + (($comAddons | ForEach-Object { $ind + $_ }) -join $nl) + $nl
    $texto = $texto.Substring(0, $m.Index) + $bloco + $texto.Substring($m.Index + $m.Length)
    [IO.File]::WriteAllText($gameinfo, $texto)
    Write-Host (L giHabilitado $backup)
  } else {
    Write-Host (L giJa)
  }

  New-Item -ItemType Directory -Force $addons | Out-Null
  Copy-Item $Vpk $instalado -Force
  if (-not (GravarIdioma $instalado $Idioma)) { Write-Host "(language marker not found; the mod will use English)" -ForegroundColor Yellow }
  Write-Host (L instalado $instalado) -ForegroundColor Green

  $conflitos = Get-ChildItem $addons -Filter "*.vpk" | Where-Object { $_.Name -ne $nomeVpk }
  if ($conflitos) {
    Write-Host (L outros ($conflitos.Name -join ", ")) -ForegroundColor Yellow
    Write-Host (L conflito) -ForegroundColor Yellow
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
      Write-Host (L codigo $conta.Name) -ForegroundColor Cyan
      Write-Host (L codigoDica)
    }
  }
  Write-Host ""
  Write-Host (L pronto) -ForegroundColor Green
  Write-Host (L reinstalar)
  exit 0
} catch {
  Write-Host ""
  Write-Host (L erro $_.Exception.Message) -ForegroundColor Red
  exit 1
}
