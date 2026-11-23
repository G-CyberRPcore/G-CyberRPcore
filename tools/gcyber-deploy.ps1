<#
.SYNOPSIS
    G-CyberRPcore CLI & Ecosystem Auto-Deployer for CyberMP (Cyberpunk 2077)
.DESCRIPTION
    Comprehensive management, automated deployment, git synchronization, syntax verification,
    and server orchestration tool for G-CyberRPcore dedicated roleplay servers.
.EXAMPLE
    .\gcyber-deploy.ps1 -Command status
    .\gcyber-deploy.ps1 -Command deploy
    .\gcyber-deploy.ps1 -Command sync
    .\gcyber-deploy.ps1 -Command test
    .\gcyber-deploy.ps1 -Command start
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("status", "check", "deploy", "install", "sync", "update", "test", "validate", "clean", "start", "restart", "admin", "menu", "help", "")]
    [string]$Command = "",

    [Parameter()]
    [switch]$Force,

    [Parameter()]
    [switch]$NoColor
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Smart directory resolver: check if running from server root or subfolder (e.g. tools/)
if (-not (Test-Path (Join-Path $ScriptDir "cybermp-server.exe"))) {
    $parentDir = Split-Path -Parent $ScriptDir
    $grandParentDir = Split-Path -Parent $parentDir
    $cwd = (Get-Location).Path

    if (Test-Path (Join-Path $parentDir "cybermp-server.exe")) {
        $ScriptDir = $parentDir
    } elseif (Test-Path (Join-Path $grandParentDir "cybermp-server.exe")) {
        $ScriptDir = $grandParentDir
    } elseif (Test-Path (Join-Path $cwd "cybermp-server.exe")) {
        $ScriptDir = $cwd
    }
}
Set-Location -Path $ScriptDir

# =====================================================================
# Configuration & Official Repositories
# =====================================================================
$ServerExe = Join-Path $ScriptDir "cybermp-server.exe"
$ServerToml = Join-Path $ScriptDir "server.toml"
$ResourcesDir = Join-Path $ScriptDir "resources"
$CacheDir = Join-Path $ScriptDir "cache"
$DatabaseDir = Join-Path $ScriptDir "database"

# Resolve CEF cache dynamically using standard environment variables
$CefCacheDir = $null
$potentialCefPaths = @()
if ($env:ProgramData) {
    $potentialCefPaths += Join-Path $env:ProgramData "cybermp\resources\mp\cache\cef-cache"
}
if ($env:LOCALAPPDATA) {
    $potentialCefPaths += Join-Path $env:LOCALAPPDATA "cybermp\cache\cef-cache"
}
foreach ($p in $potentialCefPaths) {
    if ($p -and (Test-Path $p)) {
        $CefCacheDir = $p
        break
    }
}

$OfficialRepos = @(
    @{
        Name        = "G-CyberRPcore"
        Url         = "https://github.com/G-CyberRPcore/G-CyberRPcore.git"
        Path        = Join-Path $ResourcesDir "G-CyberRPcore"
        Description = "Core Roleplay Framework, DAL, Economy & Admin Engine"
        Required    = $true
        HasNpm      = $true
    },
    @{
        Name        = "gcyber-loading"
        Url         = "https://github.com/G-CyberRPcore/gcyber-loading.git"
        Path        = Join-Path $ResourcesDir "gcyber-loading"
        Description = "Cyberpunk Loading Screen, Equalizer & Audio Track"
        Required    = $true
        HasNpm      = $false
    },
    @{
        Name        = "gcyber-hud"
        Url         = "https://github.com/G-CyberRPcore/gcyber-hud.git"
        Path        = Join-Path $ResourcesDir "gcyber-hud"
        Description = "Circular Survival Status Gauges, Voice & Speedometer"
        Required    = $true
        HasNpm      = $false
    },
    @{
        Name        = "gcyber-multicharacter"
        Url         = "https://github.com/G-CyberRPcore/gcyber-multicharacter.git"
        Path        = Join-Path $ResourcesDir "gcyber-multicharacter"
        Description = "4-Slot Character Selection Roster & In-Game Deletion"
        Required    = $true
        HasNpm      = $false
    },
    @{
        Name        = "gcyber-inventory"
        Url         = "https://github.com/G-CyberRPcore/gcyber-inventory.git"
        Path        = Join-Path $ResourcesDir "gcyber-inventory"
        Description = "Multi-Container Drag & Drop Inventory, Hotbar & Cyberware"
        Required    = $true
        HasNpm      = $false
    }
)

# =====================================================================
# Output & Aesthetic Styling
# =====================================================================
function Write-Color([string]$text, [ConsoleColor]$color = [ConsoleColor]::White, [switch]$NoNewLine) {
    if ($NoColor) {
        if ($NoNewLine) { Write-Host -NoNewline $text } else { Write-Host $text }
    } else {
        if ($NoNewLine) { Write-Host -NoNewline $text -ForegroundColor $color } else { Write-Host $text -ForegroundColor $color }
    }
}

function Write-CyberLog([string]$level, [string]$message) {
    $time = (Get-Date).ToString("HH:mm:ss")
    Write-Color "[$time] " -color DarkGray -NoNewLine
    switch ($level.ToUpper()) {
        "INFO"     { Write-Color "[INFO] " -color Cyan -NoNewLine }
        "SUCCESS"  { Write-Color "[OK]   " -color Green -NoNewLine }
        "WARN"     { Write-Color "[WARN] " -color Yellow -NoNewLine }
        "ERROR"    { Write-Color "[ERR]  " -color Red -NoNewLine }
        "NETWATCH" { Write-Color "[NETW] " -color Magenta -NoNewLine }
        default    { Write-Color "[$level] " -color White -NoNewLine }
    }
    Write-Color $message -color White
}

function Show-CyberBanner {
    Clear-Host
    Write-Color '+=============================================================================+' -color Cyan
    Write-Color '|       ____        ______      __                 ____  ____                 |' -color Cyan
    Write-Color '|      / ____      / ____/_  __/ /_  ___  _____   / __ \/ __ \_________       |' -color Cyan
    Write-Color '|     / / __ _____/ /   / / / / __ \/ _ \/ ___/  / /_/ / /_/ / ___/ __ \      |' -color Yellow
    Write-Color '|    / /_/ /_____/ /___/ /_/ / /_/ /  __/ /     / _, _/ ____/ /__/ /_/ /      |' -color Yellow
    Write-Color '|    \____/      \____/\__, /_.___/\___/_/     /_/ |_/_/    \___/\____/       |' -color Cyan
    Write-Color '|                     /____/                                                  |' -color Cyan
    Write-Color '|                                                                             |' -color Cyan
    Write-Color '|         CyberMP Dedicated Server Orchestrator and Auto-Deployer v1.0.0        |' -color Green
    Write-Color '|                   Night City REDengine Roleplay Framework                   |' -color DarkCyan
    Write-Color '+=============================================================================+' -color Cyan
    Write-Host ""
}

# =====================================================================
# Engine Functions
# =====================================================================

function Test-Prerequisites {
    Write-CyberLog "NETWATCH" "Scanning environment dependencies & hardware ports..."

    # 1. Git
    $gitCheck = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCheck) {
        $gitVer = (git --version 2>&1).Trim()
        Write-CyberLog "SUCCESS" "Git CLI detected: $gitVer"
    } else {
        Write-CyberLog "ERROR" "Git is NOT installed or not on system PATH! Git is required for auto-deployment."
    }

    # 2. Node.js
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        $nodeVer = (node -v 2>&1).Trim()
        Write-CyberLog "SUCCESS" "Node.js runtime detected: $nodeVer"
    } else {
        Write-CyberLog "WARN" "Node.js CLI not found on host PATH. Server uses embedded libnode.dll."
    }

    # 3. Server Executable
    if (Test-Path $ServerExe) {
        $fileInfo = Get-Item $ServerExe
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-CyberLog "SUCCESS" "CyberMP Server binary verified ($sizeMB MB): $ServerExe"
    } else {
        Write-CyberLog "ERROR" "Server binary NOT found at $ServerExe"
    }

    # 4. Server Configuration
    if (Test-Path $ServerToml) {
        Write-CyberLog "SUCCESS" "Server configuration verified: $ServerToml"
    } else {
        Write-CyberLog "WARN" "server.toml not found! Deploy action can generate a default configuration."
    }

    # 5. Database Diagnostics
    $mysqlAvailable = $false
    try {
        $socket = New-Object System.Net.Sockets.TcpClient
        $connect = $socket.BeginConnect("127.0.0.1", 3307, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne(400, $false)
        if ($success -and $socket.Connected) {
            $mysqlAvailable = $true
            $socket.EndConnect($connect)
            $socket.Close()
        }
    } catch {
        $mysqlAvailable = $false
    }

    if ($mysqlAvailable) {
        Write-CyberLog "SUCCESS" "MariaDB/MySQL connection active on 127.0.0.1:3307 (Primary DAL Driver)"
    } else {
        $sqlitePath = Join-Path $DatabaseDir "gcyberrp.sqlite"
        if (Test-Path $sqlitePath) {
            Write-CyberLog "INFO" "Port 3307 offline -> Portable SQLite fallback active ($sqlitePath)"
        } else {
            Write-CyberLog "INFO" "Port 3307 offline -> Zero-config SQLite will initialize automatically on boot"
        }
    }

    # 6. Network Ports
    $tcp2077 = Get-NetTCPConnection -LocalPort 2077 -ErrorAction SilentlyContinue
    $tcp2078 = Get-NetTCPConnection -LocalPort 2078 -ErrorAction SilentlyContinue
    if ($tcp2077) {
        Write-CyberLog "WARN" "Port 2077 (Game Server) is currently IN USE by PID $($tcp2077[0].OwningProcess)"
    } else {
        Write-CyberLog "SUCCESS" "Port 2077 (Game Server) is available"
    }
    if ($tcp2078) {
        Write-CyberLog "WARN" "Port 2078 (G-CyberAdmin Web Panel) is currently IN USE by PID $($tcp2078[0].OwningProcess)"
    } else {
        Write-CyberLog "SUCCESS" "Port 2078 (G-CyberAdmin Web Panel) is available"
    }
}

function Get-EcosystemStatus {
    Write-CyberLog "NETWATCH" "Inspecting G-CyberRPcore ecosystem resource repositories..."
    Write-Host ""

    $rows = @()
    foreach ($repo in $OfficialRepos) {
        $name = $repo.Name
        $path = $repo.Path
        $status = "Missing"
        $branch = "-"
        $commit = "-"
        $changes = "-"
        $remoteSync = "-"

        if (Test-Path $path) {
            $gitDir = Join-Path $path ".git"
            if (Test-Path $gitDir) {
                $status = "Installed"
                try {
                    $branch = (git -C $path rev-parse --abbrev-ref HEAD 2>$null).Trim()
                    $commit = (git -C $path rev-parse --short HEAD 2>$null).Trim()
                    $diff = (git -C $path status --porcelain 2>$null)
                    if ($diff) {
                        $changes = "Modified ($($diff.Count))"
                    } else {
                        $changes = "Clean"
                    }

                    # Remote check
                    $remote = (git -C $path remote 2>$null)
                    if ($remote) {
                        $remoteSync = "Tracked"
                    } else {
                        $remoteSync = "No Remote"
                    }
                } catch {
                    $status = "Git Error"
                }
            } else {
                $status = "No Git"
                $changes = "Non-versioned"
            }
        }

        $rows += [PSCustomObject]@{
            Resource    = $name
            Status      = $status
            Branch      = $branch
            Commit      = $commit
            WorkingTree = $changes
            Remote      = $remoteSync
        }
    }

    # Also check chat
    $chatPath = Join-Path $ResourcesDir "chat"
    if (Test-Path $chatPath) {
        $rows += [PSCustomObject]@{
            Resource    = "chat (builtin)"
            Status      = "Installed"
            Branch      = "local"
            Commit      = "native"
            WorkingTree = "Clean"
            Remote      = "CyberMP Core"
        }
    }

    $rows | Format-Table -AutoSize | Out-String | Write-Host
}

function Deploy-Ecosystem {
    Write-CyberLog "NETWATCH" "Initiating automated ecosystem deployment & synchronization..."

    $origPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    # Ensure directories exist
    if (-not (Test-Path $ResourcesDir)) {
        New-Item -ItemType Directory -Path $ResourcesDir -Force | Out-Null
        Write-CyberLog "SUCCESS" "Created resources directory: $ResourcesDir"
    }
    if (-not (Test-Path $CacheDir)) {
        New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null
        Write-CyberLog "SUCCESS" "Created cache directory: $CacheDir"
    }
    if (-not (Test-Path $DatabaseDir)) {
        New-Item -ItemType Directory -Path $DatabaseDir -Force | Out-Null
        Write-CyberLog "SUCCESS" "Created database directory: $DatabaseDir"
    }

    # Clone or Update Repositories
    foreach ($repo in $OfficialRepos) {
        $name = $repo.Name
        $url = $repo.Url
        $path = $repo.Path

        Write-Host ""
        Write-CyberLog "INFO" "Processing resource: $name ($($repo.Description))"

        if (-not (Test-Path $path)) {
            Write-CyberLog "NETWATCH" "Cloning $name from $url..."
            git clone $url $path
            if (Test-Path $path) {
                Write-CyberLog "SUCCESS" "Successfully deployed $name into $path"
            } else {
                Write-CyberLog "ERROR" "Failed to clone $name!"
            }
        } else {
            Write-CyberLog "SUCCESS" "Resource directory already exists: $path"
            $gitDir = Join-Path $path ".git"
            if (Test-Path $gitDir) {
                # Configure remote if missing
                $currentRemote = (git -C $path remote get-url origin 2>$null)
                if (-not $currentRemote) {
                    Write-CyberLog "INFO" "Setting remote origin to $url..."
                    git -C $path remote add origin $url
                }
                Write-CyberLog "INFO" "Fetching latest changes from origin..."
                git -C $path fetch origin 2>&1 | Out-Null
                $localCommit = (git -C $path rev-parse HEAD 2>$null)
                $remoteCommit = (git -C $path rev-parse origin/main 2>$null)

                if ($localCommit -ne $remoteCommit) {
                    Write-CyberLog "WARN" "Updating $name to latest origin/main ($($remoteCommit.Substring(0,7)))..."
                    git -C $path pull origin main
                    Write-CyberLog "SUCCESS" "Updated $name successfully."
                } else {
                    Write-CyberLog "SUCCESS" "$name is already fully up to date."
                }
            } else {
                Write-CyberLog "WARN" "$name directory is not a git repository. Skipping git pull."
            }
        }

        # Handle npm dependencies if required
        if ($repo.HasNpm) {
            $nodeModules = Join-Path $path "node_modules"
            if (-not (Test-Path $nodeModules)) {
                Write-CyberLog "INFO" "Installing Node.js dependencies for $name..."
                npm --prefix $path install --production
                Write-CyberLog "SUCCESS" "Dependencies installed for $name."
            } else {
                Write-CyberLog "SUCCESS" "Node modules verified for $name."
            }
        }
    }

    # Verify server.toml
    Write-Host ""
    Write-CyberLog "NETWATCH" "Validating server.toml resource registrations..."
    if (Test-Path $ServerToml) {
        $tomlContent = Get-Content $ServerToml -Raw
        if ($tomlContent -match 'resources\s*=\s*\[([\s\S]*?)\]') {
            $resourcesBlock = $matches[1]
            Write-CyberLog "SUCCESS" "Active configured resources in server.toml:"
            $resourcesBlock.Trim().Split("`n") | ForEach-Object {
                $line = $_.Trim()
                if ($line) { Write-Host "    - $line" -ForegroundColor DarkCyan }
            }
        }
    }

    Write-Host ""
    Write-CyberLog "SUCCESS" "============================================================"
    Write-CyberLog "SUCCESS" "  G-CyberRPcore Ecosystem Auto-Deployment Completed Cleanly! "
    Write-CyberLog "SUCCESS" "============================================================"

    $ErrorActionPreference = $origPref
}

function Sync-Ecosystem {
    Write-CyberLog "NETWATCH" "Synchronizing all ecosystem resources with GitHub..."
    Write-Host ""

    $origPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    foreach ($repo in $OfficialRepos) {
        $name = $repo.Name
        $path = $repo.Path

        if (Test-Path (Join-Path $path ".git")) {
            Write-CyberLog "INFO" "Syncing $name..."
            try {
                $commitBefore = (git -C $path rev-parse --short HEAD 2>$null).Trim()
                $fetchOutput = (git -C $path fetch origin 2>&1)
                $pullOutput = (git -C $path pull origin main 2>&1)
                $commitAfter = (git -C $path rev-parse --short HEAD 2>$null).Trim()

                if ($commitBefore -ne $commitAfter) {
                    Write-CyberLog "SUCCESS" "$name updated: $commitBefore -> $commitAfter"
                } else {
                    Write-CyberLog "SUCCESS" "$name is already at latest commit ($commitAfter)"
                }
            } catch {
                Write-CyberLog "ERROR" "Failed to sync $($name): $_"
            }
        } else {
            Write-CyberLog "WARN" "Skipping $name (Not a Git repository)"
        }
    }

    $ErrorActionPreference = $origPref
}

function Test-CodeSyntax {
    Write-CyberLog "NETWATCH" "Running strict JavaScript syntax analysis across all ecosystem files..."
    Write-Host ""

    $passed = 0
    $failed = 0

    foreach ($repo in $OfficialRepos) {
        $path = $repo.Path
        if (-not (Test-Path $path)) { continue }

        Write-Color "Checking: $($repo.Name)" -color Yellow
        $jsFiles = Get-ChildItem -Path $path -Filter "*.js" -Recurse | Where-Object {
            $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\\\.git\\"
        }

        foreach ($file in $jsFiles) {
            $relPath = $file.FullName.Substring($ScriptDir.Length + 1)
            $checkResult = & node --check $file.FullName 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Color "  [PASS] $relPath" -color Green
                $passed++
            } else {
                Write-Color "  [FAIL] $relPath" -color Red
                Write-Host "         $checkResult" -ForegroundColor DarkRed
                $failed++
            }
        }
    }

    Write-Host ""
    if ($failed -eq 0) {
        Write-CyberLog "SUCCESS" "Syntax Analysis PASSED: All $passed JavaScript files are valid and ready for V8 runtime!"
    } else {
        Write-CyberLog "ERROR" "Syntax Analysis FAILED: $failed file(s) contain syntax errors. Fix them before booting server."
    }
}

function Clear-ServerCache {
    Write-CyberLog "NETWATCH" "Purging server cache & CEF browser artifacts..."

    # Kill running server instances
    $processes = Get-Process cybermp-server -ErrorAction SilentlyContinue
    if ($processes) {
        Write-CyberLog "INFO" "Terminating running cybermp-server process..."
        Stop-Process -Name cybermp-server -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }

    # Clear server cache
    if (Test-Path $CacheDir) {
        Remove-Item -Path "$CacheDir\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-CyberLog "SUCCESS" "Cleared server cache: $CacheDir"
    }

    # Clear CEF cache
    if ($CefCacheDir -and (Test-Path $CefCacheDir)) {
        Remove-Item -Path "$CefCacheDir\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-CyberLog "SUCCESS" "Cleared client CEF cache: $CefCacheDir"
    }

    Write-CyberLog "SUCCESS" "Cache refresh completed successfully."
}

function Start-ServerInstance {
    Show-CyberBanner
    Write-CyberLog "NETWATCH" "Preparing server launch sequence..."

    # 1. Kill lingering server
    Get-Process cybermp-server -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    # 2. Free Port 2077
    Get-NetTCPConnection -LocalPort 2077 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Get-NetUDPEndpoint -LocalPort 2077 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }

    # 3. Purge cache
    Clear-ServerCache

    # 4. Launch banner
    Write-Host ""
    Write-Color "================================================================" -color Cyan
    Write-Color "  NIGHT CITY ROLEPLAY DEDICATED SERVER ACTIVE                   " -color Green
    Write-Color "  Game Endpoint: 0.0.0.0:2077 TCP/UDP                           " -color White
    Write-Color "  G-CyberAdmin Web Panel: http://127.0.0.1:2078                 " -color Yellow
    Write-Color "================================================================" -color Cyan
    Write-Host ""

    & $ServerExe -run
}

function Open-AdminPanel {
    Write-CyberLog "NETWATCH" "Opening G-CyberAdmin Web Panel (http://127.0.0.1:2078)..."
    Start-Process "http://127.0.0.1:2078"
}

# =====================================================================
# Interactive Menu
# =====================================================================
function Show-InteractiveMenu {
    while ($true) {
        Show-CyberBanner
        Write-Color "Select an action for G-CyberRPcore Ecosystem:" -color Yellow
        Write-Host ""
        Write-Color "  [1] Check Ecosystem Health & Status (Diagnostics)" -color Cyan
        Write-Color "  [2] Deploy / Clone All Ecosystem Resources" -color Green
        Write-Color "  [3] Synchronize All Resources from Git" -color Cyan
        Write-Color "  [4] Validate JavaScript Syntax (node --check)" -color Green
        Write-Color "  [5] Purge Server & CEF Cache" -color Yellow
        Write-Color "  [6] Launch CyberMP Server & Admin Engine" -color Magenta
        Write-Color "  [7] Open G-CyberAdmin Web Dashboard (Port 2078)" -color Cyan
        Write-Color "  [0] Exit" -color DarkGray
        Write-Host ""
        $choice = Read-Host "Enter selection (0-7)"

        switch ($choice) {
            "1" {
                Write-Host ""
                Test-Prerequisites
                Write-Host ""
                Get-EcosystemStatus
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "2" {
                Write-Host ""
                Deploy-Ecosystem
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "3" {
                Write-Host ""
                Sync-Ecosystem
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "4" {
                Write-Host ""
                Test-CodeSyntax
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "5" {
                Write-Host ""
                Clear-ServerCache
                Write-Host ""
                Read-Host "Press Enter to return to menu"
            }
            "6" {
                Start-ServerInstance
                break
            }
            "7" {
                Open-AdminPanel
                Start-Sleep -Seconds 1
            }
            "0" {
                Write-CyberLog "INFO" "Exiting G-CyberRPcore Orchestrator. See you in Night City, choom!"
                break
            }
            default {
                Write-Color "Invalid selection. Please try again." -color Red
                Start-Sleep -Seconds 1
            }
        }
    }
}

# =====================================================================
# Main Dispatcher
# =====================================================================
switch ($Command.ToLower()) {
    "status"   { Show-CyberBanner; Test-Prerequisites; Get-EcosystemStatus }
    "check"    { Show-CyberBanner; Test-Prerequisites; Get-EcosystemStatus }
    "deploy"   { Show-CyberBanner; Deploy-Ecosystem }
    "install"  { Show-CyberBanner; Deploy-Ecosystem }
    "sync"     { Show-CyberBanner; Sync-Ecosystem }
    "update"   { Show-CyberBanner; Sync-Ecosystem }
    "test"     { Show-CyberBanner; Test-CodeSyntax }
    "validate" { Show-CyberBanner; Test-CodeSyntax }
    "clean"    { Show-CyberBanner; Clear-ServerCache }
    "start"    { Start-ServerInstance }
    "restart"  { Start-ServerInstance }
    "admin"    { Open-AdminPanel }
    "menu"     { Show-InteractiveMenu }
    "help"     {
        Show-CyberBanner
        Write-Color "Usage: .\gcyber-deploy.ps1 [COMMAND]" -color Yellow
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  status   / check     Check prerequisites and ecosystem repository status"
        Write-Host "  deploy   / install   Clone or verify all official ecosystem resources"
        Write-Host "  sync     / update    Synchronize all ecosystem resources from GitHub"
        Write-Host "  test     / validate  Run JavaScript syntax verification across all files"
        Write-Host "  clean                Purge server cache and CEF browser cache"
        Write-Host "  start    / restart   Launch dedicated server with clean cache and ports"
        Write-Host "  admin                Launch G-CyberAdmin web panel in default browser"
        Write-Host "  menu                 Open interactive Cyberpunk terminal menu (default)"
        Write-Host ""
    }
    default {
        Show-InteractiveMenu
    }
}
