# Funções compartilhadas: achar a instalação do Deadlock e carregar as ferramentas C#.
$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot

if (-not ("Vpk" -as [type])) {
  Add-Type -Path (Join-Path $PSScriptRoot "Vpk.cs"), (Join-Path $PSScriptRoot "S2Resource.cs")
}

. (Join-Path $PSScriptRoot "pacote\achar-deadlock.ps1")

function Get-VersaoJogo([string]$jogo) {
  $inf = Get-Content (Join-Path $jogo "game\citadel\steam.inf") -ErrorAction SilentlyContinue
  $linha = $inf | Where-Object { $_ -like "ClientVersion=*" } | Select-Object -First 1
  if ($linha) { return $linha.Split("=")[1].Trim() }
  return "?"
}
