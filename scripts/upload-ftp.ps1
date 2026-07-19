param(
    [Parameter(Mandatory = $true)] [string] $Server,
    [Parameter(Mandatory = $true)] [string] $Username,
    [Parameter(Mandatory = $true)] [string] $Password,
    [Parameter(Mandatory = $true)] [string] $LocalRoot
)

$ErrorActionPreference = 'Stop'
$resolvedRoot = (Resolve-Path -LiteralPath $LocalRoot).Path
$credential = New-Object System.Net.NetworkCredential($Username, $Password)

function Get-RelativePath([string] $FullPath) {
    return $FullPath.Substring($resolvedRoot.Length).TrimStart([char[]]@('\', '/'))
}

function New-FtpRequest([string] $RelativePath, [string] $Method) {
    $segments = $RelativePath -split '[\\/]' | Where-Object { $_ -ne '' } | ForEach-Object {
        [System.Uri]::EscapeDataString($_)
    }
    $remotePath = $segments -join '/'
    $request = [System.Net.FtpWebRequest]::Create("ftp://$Server/$remotePath")
    $request.Credentials = $credential
    $request.Method = $Method
    $request.UseBinary = $true
    $request.KeepAlive = $false
    $request.Timeout = 30000
    $request.ReadWriteTimeout = 30000
    return $request
}

$directories = Get-ChildItem -LiteralPath $resolvedRoot -Directory -Recurse |
    Sort-Object { $_.FullName.Length }

foreach ($directory in $directories) {
    $relative = Get-RelativePath $directory.FullName
    $request = New-FtpRequest $relative ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)
    try {
        $response = $request.GetResponse()
        $response.Close()
    } catch [System.Net.WebException] {
        $response = $_.Exception.Response
        if ($null -eq $response -or [int] $response.StatusCode -ne 550) {
            throw
        }
        $response.Close()
    }
}

$files = Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse
$uploaded = 0
foreach ($file in $files) {
    $relative = Get-RelativePath $file.FullName
    $request = New-FtpRequest $relative ([System.Net.WebRequestMethods+Ftp]::UploadFile)
    $request.ContentLength = $file.Length
    $requestStream = $request.GetRequestStream()
    $fileStream = [System.IO.File]::OpenRead($file.FullName)
    try {
        $fileStream.CopyTo($requestStream)
    } finally {
        $fileStream.Close()
        $requestStream.Close()
    }
    $response = $request.GetResponse()
    $response.Close()
    $uploaded++
}

Write-Output "Archivos subidos: $uploaded"
