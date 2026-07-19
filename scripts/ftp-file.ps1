param(
    [Parameter(Mandatory = $true)] [string] $Server,
    [Parameter(Mandatory = $true)] [string] $Username,
    [Parameter(Mandatory = $true)] [string] $Password,
    [Parameter(Mandatory = $true)] [string] $RemotePath,
    [string] $LocalFile,
    [switch] $Delete
)

$ErrorActionPreference = 'Stop'
$segments = $RemotePath -split '[\\/]' | Where-Object { $_ -ne '' } | ForEach-Object {
    [System.Uri]::EscapeDataString($_)
}
$uri = "ftp://$Server/$($segments -join '/')"
$request = [System.Net.FtpWebRequest]::Create($uri)
$request.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
$request.UseBinary = $true
$request.KeepAlive = $false
$request.Timeout = 30000
$request.ReadWriteTimeout = 30000

if ($Delete) {
    $request.Method = [System.Net.WebRequestMethods+Ftp]::DeleteFile
} else {
    $resolvedFile = (Resolve-Path -LiteralPath $LocalFile).Path
    $fileInfo = Get-Item -LiteralPath $resolvedFile
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.ContentLength = $fileInfo.Length
    $requestStream = $request.GetRequestStream()
    $fileStream = [System.IO.File]::OpenRead($resolvedFile)
    try {
        $fileStream.CopyTo($requestStream)
    } finally {
        $fileStream.Close()
        $requestStream.Close()
    }
}

$response = $request.GetResponse()
$response.Close()
Write-Output 'OK'
