# Install the M365 Workbench native messaging host for Chrome/Edge on Windows.
# Usage: .\install-native-host.ps1 [-ExtensionId <id>]

param(
    [Parameter(Mandatory=$false)]
    [string]$ExtensionId
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$McpServerDir = Join-Path $ProjectDir "mcp-server"
$HostName = "com.m365workbench.relay"

# Build the MCP server if not already built
$NativeHostPath = Join-Path $McpServerDir "dist\native-host.js"
if (-not (Test-Path $NativeHostPath)) {
    Write-Host "Building MCP server..."
    Push-Location $McpServerDir
    npm install
    npm run build
    Pop-Location
}

# Get extension ID
if (-not $ExtensionId) {
    $ExtensionId = Read-Host "Enter your Chrome extension ID (find it at chrome://extensions)"
}

if (-not $ExtensionId) {
    Write-Error "Extension ID is required."
    exit 1
}

# Create a wrapper batch file
$WrapperPath = Join-Path $McpServerDir "dist\native-host.bat"
$NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodePath) {
    Write-Error "Node.js not found in PATH."
    exit 1
}

@"
@echo off
"$NodePath" "$NativeHostPath" %*
"@ | Set-Content -Path $WrapperPath -Encoding ASCII

# Generate the manifest
$ManifestContent = @{
    name = $HostName
    description = "M365 Workbench Native Messaging Host"
    path = $WrapperPath
    type = "stdio"
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 3

$ManifestPath = Join-Path $McpServerDir "dist\$HostName.json"
$ManifestContent | Set-Content -Path $ManifestPath -Encoding UTF8

Write-Host "Manifest written to $ManifestPath"

# Install registry keys for Chrome and Edge
function Install-RegistryKey {
    param(
        [string]$BrowserName,
        [string]$RegPath
    )

    $KeyPath = "$RegPath\$HostName"

    if (-not (Test-Path $KeyPath)) {
        New-Item -Path $KeyPath -Force | Out-Null
    }

    Set-ItemProperty -Path $KeyPath -Name "(Default)" -Value $ManifestPath
    Write-Host "Registry key installed for $BrowserName at $KeyPath"
}

# Chrome
Install-RegistryKey -BrowserName "Chrome" -RegPath "HKCU:\Software\Google\Chrome\NativeMessagingHosts"

# Edge
Install-RegistryKey -BrowserName "Edge" -RegPath "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts"

Write-Host ""
Write-Host "Native messaging host installed successfully."
Write-Host "Extension ID: $ExtensionId"
Write-Host "Host path: $WrapperPath"
Write-Host ""
Write-Host "Restart your browser for changes to take effect."
