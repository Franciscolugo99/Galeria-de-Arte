param(
    [Parameter(Mandatory = $true)] [string] $Server,
    [Parameter(Mandatory = $true)] [string] $Username,
    [Parameter(Mandatory = $true)] [string] $Password,
    [Parameter(Mandatory = $true)] [string] $LocalRoot,
    [string] $RemoteRoot = '/public_html'
)

$ErrorActionPreference = 'Stop'
$resolvedRoot = (Resolve-Path -LiteralPath $LocalRoot).Path
$winscpAssembly = 'C:\Program Files (x86)\WinSCP\WinSCPnet.dll'

if (-not (Test-Path -LiteralPath $winscpAssembly)) {
    throw "No se encontró WinSCP en $winscpAssembly"
}
if ($RemoteRoot -ne '/public_html') {
    throw 'Por seguridad, este despliegue sólo admite /public_html como destino.'
}
foreach ($requiredFile in @('index.html', 'maintenance.html', '.htaccess')) {
    if (-not (Test-Path -LiteralPath (Join-Path $resolvedRoot $requiredFile))) {
        throw "Falta $requiredFile en el paquete de publicación."
    }
}

Add-Type -Path $winscpAssembly

$sessionOptions = New-Object WinSCP.SessionOptions -Property @{
    Protocol = [WinSCP.Protocol]::Ftp
    FtpSecure = [WinSCP.FtpSecure]::Explicit
    HostName = $Server
    UserName = $Username
    Password = $Password
}
$transferOptions = New-Object WinSCP.TransferOptions -Property @{
    TransferMode = [WinSCP.TransferMode]::Binary
}
$session = New-Object WinSCP.Session
$maintenanceEnabled = $false
$completed = $false

function Get-RelativePath([string] $FullPath) {
    return $FullPath.Substring($resolvedRoot.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
}

function Ensure-RemoteDirectory([string] $RemoteDirectory) {
    if ($RemoteDirectory -eq $RemoteRoot -or $session.FileExists($RemoteDirectory)) {
        return
    }
    $parent = [System.IO.Path]::GetDirectoryName($RemoteDirectory.Replace('/', '\')).Replace('\', '/')
    if ([string]::IsNullOrWhiteSpace($parent)) {
        $parent = '/'
    }
    Ensure-RemoteDirectory $parent
    $session.CreateDirectory($RemoteDirectory)
}

function Send-File([string] $LocalFile, [string] $RelativePath) {
    $remotePath = "$RemoteRoot/$RelativePath"
    $remoteDirectory = $remotePath.Substring(0, $remotePath.LastIndexOf('/'))
    Ensure-RemoteDirectory $remoteDirectory
    $session.PutFiles($LocalFile, $remotePath, $false, $transferOptions).Check()
}

try {
    $session.Open($sessionOptions)

    # La página autónoma y las reglas se instalan antes de activar el bloqueo.
    Send-File (Join-Path $resolvedRoot 'maintenance.html') 'maintenance.html'
    Send-File (Join-Path $resolvedRoot '.htaccess') '.htaccess'

    $marker = New-TemporaryFile
    try {
        Send-File $marker.FullName '.maintenance'
    } finally {
        Remove-Item -LiteralPath $marker.FullName -Force -ErrorAction SilentlyContinue
    }
    $maintenanceEnabled = $true
    Write-Output 'Modo mantenimiento activado.'

    $allFiles = Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse
    $assets = $allFiles |
        Where-Object { (Get-RelativePath $_.FullName) -like 'assets/*' } |
        Sort-Object FullName
    $content = $allFiles |
        Where-Object {
            $relative = Get-RelativePath $_.FullName
            $relative -notlike 'assets/*' -and
            $relative -notin @('index.html', 'maintenance.html', '.htaccess', '.maintenance')
        } |
        Sort-Object FullName

    $uploaded = 3
    foreach ($file in @($assets) + @($content)) {
        Send-File $file.FullName (Get-RelativePath $file.FullName)
        $uploaded++
    }

    # El documento que referencia los nuevos assets se reemplaza al final.
    Send-File (Join-Path $resolvedRoot 'index.html') 'index.html'
    $uploaded++

    $session.RemoveFiles("$RemoteRoot/.maintenance").Check()
    $maintenanceEnabled = $false
    $completed = $true
    Write-Output "Publicación completada: $uploaded archivos subidos."
    Write-Output 'Modo mantenimiento desactivado.'
} finally {
    if ($session.Opened) {
        $session.Dispose()
    }
    if ($maintenanceEnabled -and -not $completed) {
        Write-Warning 'La publicación se interrumpió. El sitio quedó en mantenimiento para evitar mostrar una versión incompleta.'
    }
}
