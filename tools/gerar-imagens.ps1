# Gera as imagens do mod (mod/imagens/*.png) a partir da logo em alta resolução.
# O build (build-mod.ps1) transforma cada PNG de mod/imagens em textura do jogo:
#   mod/imagens/<nome>.png -> panorama/images/deadlock_utils/<nome>_png.vtex_c
#   (no CSS/JS: s2r://panorama/images/deadlock_utils/<nome>_png.vtex)
#
#   powershell -ExecutionPolicy Bypass -File tools\gerar-imagens.ps1 [-Logo <png da logo>]
param([string]$Logo)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$Raiz = Split-Path -Parent $PSScriptRoot
if (-not $Logo) { $Logo = Join-Path $Raiz "docs\logo\deadlock-utils.png" }
if (-not (Test-Path $Logo)) { throw "Logo não encontrada: $Logo" }
$saida = Join-Path $Raiz "mod\imagens"
New-Item -ItemType Directory -Force $saida | Out-Null

$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Logo))
# Caixa dos pixels visíveis (alfa > 8) numa faixa de linhas.
function Caixa($bmp, [int]$y0, [int]$y1) {
  $minX = $bmp.Width; $minY = $bmp.Height; $maxX = -1; $maxY = -1
  for ($y = $y0; $y -lt $y1; $y += 2) {
    for ($x = 0; $x -lt $bmp.Width; $x += 2) {
      if ($bmp.GetPixel($x, $y).A -gt 8) {
        if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  return New-Object System.Drawing.Rectangle ($minX - 2), ($minY - 2), ($maxX - $minX + 5), ($maxY - $minY + 5)
}
function Salvar($bmp, [System.Drawing.Rectangle]$origem, [int]$largura, [string]$nome) {
  $altura = [int][Math]::Round($origem.Height * $largura / $origem.Width)
  $novo = New-Object System.Drawing.Bitmap $largura, $altura, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($novo)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $largura, $altura), $origem, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $arq = Join-Path $saida "$nome.png"
  $novo.Save($arq, [System.Drawing.Imaging.ImageFormat]::Png)
  $novo.Dispose()
  Write-Host ("{0}: {1}x{2} ({3:N0} bytes)" -f $nome, $largura, $altura, (Get-Item $arq).Length)
}

# A roda fica no terço de cima; o nome embaixo.
$corte = [int]($img.Height * 0.55)
$roda = Caixa $img 0 $corte
$tudo = Caixa $img 0 $img.Height
Salvar $img $tudo 520 "logo"
Salvar $img $roda 128 "marca"
$img.Dispose()
