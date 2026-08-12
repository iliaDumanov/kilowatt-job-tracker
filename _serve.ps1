$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8420

$mime = @{
  ".html" = "text/html"; ".css" = "text/css"; ".js" = "application/javascript";
  ".json" = "application/json"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml";
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "Serving $root on port $port (all interfaces)"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    while ($reader.Peek() -ge 0 -and $reader.ReadLine() -ne "") {}

    $path = "/index.html"
    if ($requestLine -match '^\S+\s+(\S+)\s') {
      $p = $Matches[1].Split('?')[0]
      if ($p -ne "/") { $path = $p }
    }

    $filePath = Join-Path $root ($path.TrimStart("/") -replace '/', '\')
    $fullRoot = (Resolve-Path $root).Path

    $bytes = $null
    $status = "200 OK"
    $contentType = "application/octet-stream"

    if ((Test-Path $filePath -PathType Leaf) -and ((Resolve-Path $filePath).Path.StartsWith($fullRoot))) {
      $ext = [System.IO.Path]::GetExtension($filePath)
      if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
    } else {
      $status = "404 Not Found"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $contentType = "text/plain"
    }

    $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
  } catch {
  } finally {
    $client.Close()
  }
}
