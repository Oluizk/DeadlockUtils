# Acha a instalação do Deadlock (registro da Steam, bibliotecas da Steam e pastas comuns).
# Usado pelas ferramentas (tools\jogo.ps1) e pelo instalador do pacote (tools\pacote\instalar.ps1).
function Find-Deadlock {
  param([string]$Caminho)
  if ($Caminho) {
    if (Test-Path (Join-Path $Caminho "game\citadel\gameinfo.gi")) { return (Resolve-Path $Caminho).Path }
    throw "Não achei game\citadel\gameinfo.gi em '$Caminho'."
  }
  $bibliotecas = New-Object System.Collections.Generic.List[string]
  $steam = (Get-ItemProperty "HKCU:\Software\Valve\Steam" -ErrorAction SilentlyContinue).SteamPath
  if ($steam) {
    $bibliotecas.Add($steam)
    $vdf = Join-Path $steam "steamapps\libraryfolders.vdf"
    if (Test-Path $vdf) {
      foreach ($m in [regex]::Matches((Get-Content $vdf -Raw), '"path"\s+"([^"]+)"')) { $bibliotecas.Add($m.Groups[1].Value.Replace("\\", "\")) }
    }
  }
  foreach ($d in Get-PSDrive -PSProvider FileSystem) {
    $bibliotecas.Add((Join-Path $d.Root "SteamLibrary"))
    $bibliotecas.Add((Join-Path $d.Root "Program Files (x86)\Steam"))
  }
  foreach ($b in $bibliotecas) {
    $p = Join-Path $b "steamapps\common\Deadlock"
    if (Test-Path (Join-Path $p "game\citadel\gameinfo.gi")) { return $p }
  }
  throw "Não achei o Deadlock. Rode de novo passando -Jogo 'C:\caminho\para\steamapps\common\Deadlock'."
}
