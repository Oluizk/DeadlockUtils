# Instala (ou remove, com -Remover) o mod compilado em build\ no Deadlock.
# A lógica fica em tools\pacote\instalar.ps1, o mesmo instalador que vai no pacote de distribuição.
param(
  [string]$Jogo,
  [int]$Pak = 42,
  [switch]$Remover
)
$Raiz = Split-Path -Parent $PSScriptRoot
$vpk = Join-Path $Raiz ("build\pak{0:D2}_dir.vpk" -f $Pak)
if (-not $Remover -and -not (Test-Path $vpk)) { throw "Não achei $vpk. Rode tools\build-mod.ps1 primeiro." }
& (Join-Path $PSScriptRoot "pacote\instalar.ps1") -Vpk $vpk -Jogo $Jogo -Pak $Pak -Remover:$Remover
exit $LASTEXITCODE