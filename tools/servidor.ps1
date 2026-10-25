# Servidor local mínimo para abrir o app no navegador (só escuta em localhost).
param([int]$Porta = 8765, [switch]$SemAbrir)

$raiz = Split-Path -Parent $PSScriptRoot
$tipos = @{
  ".html" = "text/html; charset=utf-8"; ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"; ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"; ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Porta/")
try { $listener.Start() } catch {
  Write-Host "Não consegui abrir a porta $Porta. Talvez já esteja aberto? Tente http://localhost:$Porta/" -ForegroundColor Yellow
  exit 1
}
$url = "http://localhost:$Porta/"
Write-Host "Deadlock Utils rodando em $url  (feche esta janela para parar)" -ForegroundColor Green
if (-not $SemAbrir) { Start-Process $url }

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $caminho = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
  if ($caminho -eq "") { $caminho = "index.html" }
  $arquivo = [IO.Path]::GetFullPath((Join-Path $raiz $caminho))
  $resp = $ctx.Response
  if ($arquivo.StartsWith($raiz) -and (Test-Path $arquivo -PathType Leaf)) {
    $bytes = [IO.File]::ReadAllBytes($arquivo)
    $ext = [IO.Path]::GetExtension($arquivo).ToLower()
    $resp.ContentType = if ($tipos[$ext]) { $tipos[$ext] } else { "application/octet-stream" }
    $resp.Headers.Add("Cache-Control", "no-cache")
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $resp.StatusCode = 404
  }
  $resp.Close()
}
