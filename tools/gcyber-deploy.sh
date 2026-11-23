#!/usr/bin/env bash
# ==============================================================================
# G-CyberRPcore CLI & Ecosystem Auto-Deployer for Linux (CyberMP / Wine / Proton)
# ==============================================================================

set -e

# Detect Script Directory & Server Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR"

if [[ ! -f "$SERVER_DIR/cybermp-server.exe" ]]; then
    if [[ -f "$(dirname "$SCRIPT_DIR")/cybermp-server.exe" ]]; then
        SERVER_DIR="$(dirname "$SCRIPT_DIR")"
    elif [[ -f "$(dirname "$(dirname "$SCRIPT_DIR")")/cybermp-server.exe" ]]; then
        SERVER_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
    elif [[ -f "$(pwd)/cybermp-server.exe" ]]; then
        SERVER_DIR="$(pwd)"
    fi
fi

cd "$SERVER_DIR"

RESOURCES_DIR="$SERVER_DIR/resources"
CACHE_DIR="$SERVER_DIR/cache"
DATABASE_DIR="$SERVER_DIR/database"
SERVER_TOML="$SERVER_DIR/server.toml"
SERVER_EXE="$SERVER_DIR/cybermp-server.exe"

# Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

log_info()    { echo -e "[\033[0;37m$(date +%T)\033[0m] [${CYAN}INFO${NC}] $1"; }
log_ok()      { echo -e "[\033[0;37m$(date +%T)\033[0m] [${GREEN}OK${NC}]   $1"; }
log_warn()    { echo -e "[\033[0;37m$(date +%T)\033[0m] [${YELLOW}WARN${NC}] $1"; }
log_err()     { echo -e "[\033[0;37m$(date +%T)\033[0m] [${RED}ERR${NC}]  $1"; }
log_netwatch(){ echo -e "[\033[0;37m$(date +%T)\033[0m] [${MAGENTA}NETW${NC}] $1"; }

show_banner() {
    clear 2>/dev/null || true
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       ____        ______      __                 ____  ____                   ║${NC}"
    echo -e "${CYAN}║      / ____      / ____/_  __/ /_  ___  _____   / __ \/ __ \_________  ________ ║${NC}"
    echo -e "${YELLOW}║     / / __ _____/ /   / / / / __ \/ _ \/ ___/  / /_/ / /_/ / ___/ __ \/ ___/ _ \║${NC}"
    echo -e "${YELLOW}║    / /_/ /_____/ /___/ /_/ / /_/ /  __/ /     / _, _/ ____/ /__/ /_/ / /  /  __/║${NC}"
    echo -e "${CYAN}║    \____/      \____/\__, /_.___/\___/_/     /_/ |_/_/    \___/\____/_/   \___/ ║${NC}"
    echo -e "${CYAN}║                     /____/                                                    ║${NC}"
    echo -e "${CYAN}║                                                                               ║${NC}"
    echo -e "${GREEN}║         CyberMP Dedicated Server Orchestrator & Auto-Deployer v1.0.0          ║${NC}"
    echo -e "${CYAN}║                   Night City REDengine Roleplay Framework                     ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Repositories array: Name|URL|Description|HasNpm
REPOS=(
    "G-CyberRPcore|https://github.com/G-CyberRPcore/G-CyberRPcore.git|Core Roleplay Framework & Admin Engine|true"
    "gcyber-loading|https://github.com/G-CyberRPcore/gcyber-loading.git|Cyberpunk Neural Loading Screen|false"
    "gcyber-hud|https://github.com/G-CyberRPcore/gcyber-hud.git|Circular Status Gauges & Speedometer|false"
    "gcyber-multicharacter|https://github.com/G-CyberRPcore/gcyber-multicharacter.git|4-Slot Character Selection Roster|false"
)

test_prerequisites() {
    log_netwatch "Scanning Linux environment dependencies..."

    if command -v git >/dev/null 2>&1; then
        log_ok "Git CLI detected: $(git --version)"
    else
        log_err "Git is NOT installed. Install via: apt install git / dnf install git"
    fi

    if command -v node >/dev/null 2>&1; then
        log_ok "Node.js runtime detected: $(node -v)"
    else
        log_warn "Node.js CLI not found on host PATH. Recommended for npm & validation."
    fi

    if [[ -f "$SERVER_EXE" ]]; then
        log_ok "CyberMP Server binary verified: $SERVER_EXE"
    else
        log_warn "cybermp-server.exe not found at $SERVER_EXE. Wine/Proton required to run on Linux."
    fi

    # Check MariaDB/MySQL port 3307 or 3306
    if nc -z -w1 127.0.0.1 3307 2>/dev/null || nc -z -w1 127.0.0.1 3306 2>/dev/null; then
        log_ok "MySQL/MariaDB active on localhost (Primary DAL Driver)"
    else
        log_info "MySQL port offline -> Portable SQLite fallback active ($DATABASE_DIR/gcyberrp.sqlite)"
    fi
}

get_status() {
    log_netwatch "Inspecting G-CyberRPcore ecosystem resource status..."
    echo ""
    printf "%-25s %-12s %-10s %-10s %-15s\n" "Resource" "Status" "Branch" "Commit" "WorkingTree"
    echo "-------------------------------------------------------------------------------"

    for entry in "${REPOS[@]}"; do
        IFS='|' read -r name url desc has_npm <<< "$entry"
        repo_path="$RESOURCES_DIR/$name"

        if [[ -d "$repo_path/.git" ]]; then
            branch=$(git -C "$repo_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
            commit=$(git -C "$repo_path" rev-parse --short HEAD 2>/dev/null || echo "-")
            diff=$(git -C "$repo_path" status --porcelain 2>/dev/null || true)
            if [[ -n "$diff" ]]; then
                tree_status="Modified"
            else
                tree_status="Clean"
            fi
            printf "%-25s %-12s %-10s %-10s %-15s\n" "$name" "Installed" "$branch" "$commit" "$tree_status"
        elif [[ -d "$repo_path" ]]; then
            printf "%-25s %-12s %-10s %-10s %-15s\n" "$name" "No Git" "-" "-" "Non-versioned"
        else
            printf "%-25s %-12s %-10s %-10s %-15s\n" "$name" "Missing" "-" "-" "-"
        fi
    done

    if [[ -d "$RESOURCES_DIR/chat" ]]; then
        printf "%-25s %-12s %-10s %-10s %-15s\n" "chat (builtin)" "Installed" "local" "native" "Clean"
    fi
    echo ""
}

deploy_ecosystem() {
    log_netwatch "Starting automated ecosystem deployment & synchronization..."

    mkdir -p "$RESOURCES_DIR" "$CACHE_DIR" "$DATABASE_DIR"

    for entry in "${REPOS[@]}"; do
        IFS='|' read -r name url desc has_npm <<< "$entry"
        repo_path="$RESOURCES_DIR/$name"

        echo ""
        log_info "Processing resource: $name ($desc)"

        if [[ ! -d "$repo_path" ]]; then
            log_netwatch "Cloning $name from $url..."
            git clone "$url" "$repo_path"
            log_ok "Successfully deployed $name into $repo_path"
        else
            log_ok "Resource directory already exists: $repo_path"
            if [[ -d "$repo_path/.git" ]]; then
                git -C "$repo_path" fetch origin >/dev/null 2>&1 || true
                local_commit=$(git -C "$repo_path" rev-parse HEAD 2>/dev/null || echo "")
                remote_commit=$(git -C "$repo_path" rev-parse origin/main 2>/dev/null || echo "")

                if [[ "$local_commit" != "$remote_commit" && -n "$remote_commit" ]]; then
                    log_warn "Updating $name to latest origin/main..."
                    git -C "$repo_path" pull origin main
                    log_ok "Updated $name."
                else
                    log_ok "$name is already fully up to date."
                fi
            fi
        fi

        if [[ "$has_npm" == "true" && -f "$repo_path/package.json" ]]; then
            if [[ ! -d "$repo_path/node_modules" ]]; then
                log_info "Installing npm dependencies for $name..."
                npm --prefix "$repo_path" install --production
                log_ok "Dependencies installed."
            else
                log_ok "Node modules verified for $name."
            fi
        fi
    done

    echo ""
    log_ok "============================================================"
    log_ok "  G-CyberRPcore Ecosystem Auto-Deployment Completed Cleanly! "
    log_ok "============================================================"
}

sync_ecosystem() {
    log_netwatch "Synchronizing all ecosystem resources with GitHub..."
    echo ""

    for entry in "${REPOS[@]}"; do
        IFS='|' read -r name url desc has_npm <<< "$entry"
        repo_path="$RESOURCES_DIR/$name"

        if [[ -d "$repo_path/.git" ]]; then
            log_info "Syncing $name..."
            commit_before=$(git -C "$repo_path" rev-parse --short HEAD 2>/dev/null || echo "")
            git -C "$repo_path" fetch origin >/dev/null 2>&1 || true
            git -C "$repo_path" pull origin main >/dev/null 2>&1 || true
            commit_after=$(git -C "$repo_path" rev-parse --short HEAD 2>/dev/null || echo "")

            if [[ "$commit_before" != "$commit_after" ]]; then
                log_ok "$name updated: $commit_before -> $commit_after"
            else
                log_ok "$name is already at latest commit ($commit_after)"
            fi
        fi
    done
}

test_syntax() {
    log_netwatch "Running strict JavaScript syntax analysis across all ecosystem files..."
    echo ""

    passed=0
    failed=0

    for entry in "${REPOS[@]}"; do
        IFS='|' read -r name url desc has_npm <<< "$entry"
        repo_path="$RESOURCES_DIR/$name"

        if [[ -d "$repo_path" ]]; then
            echo -e "${YELLOW}Checking: $name${NC}"
            while IFS= read -r -d '' js_file; do
                rel_path="${js_file#$SERVER_DIR/}"
                if node --check "$js_file" >/dev/null 2>&1; then
                    echo -e "  [${GREEN}PASS${NC}] $rel_path"
                    ((passed++)) || true
                else
                    echo -e "  [${RED}FAIL${NC}] $rel_path"
                    ((failed++)) || true
                fi
            done < <(find "$repo_path" -type f -name "*.js" ! -path "*/node_modules/*" ! -path "*/.git/*" -print0)
        fi
    done

    echo ""
    if [[ $failed -eq 0 ]]; then
        log_ok "Syntax Analysis PASSED: All $passed JavaScript files are valid!"
    else
        log_err "Syntax Analysis FAILED: $failed file(s) contain syntax errors."
        exit 1
    fi
}

clean_cache() {
    log_netwatch "Purging server cache..."
    if [[ -d "$CACHE_DIR" ]]; then
        rm -rf "${CACHE_DIR:?}"/*
        log_ok "Cleared server cache: $CACHE_DIR"
    fi
}

case "${1:-menu}" in
    status|check)
        show_banner
        test_prerequisites
        get_status
        ;;
    deploy|install)
        show_banner
        deploy_ecosystem
        ;;
    sync|update)
        show_banner
        sync_ecosystem
        ;;
    test|validate)
        show_banner
        test_syntax
        ;;
    clean)
        show_banner
        clean_cache
        ;;
    help)
        show_banner
        echo "Usage: ./tools/gcyber-deploy.sh [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  status / check     Check dependencies and ecosystem repository status"
        echo "  deploy / install   Clone or verify all official ecosystem resources"
        echo "  sync / update      Synchronize all ecosystem resources from GitHub"
        echo "  test / validate    Run JavaScript syntax verification across all files"
        echo "  clean              Purge server cache"
        echo ""
        ;;
    *)
        show_banner
        echo -e "${YELLOW}Select an action for G-CyberRPcore Ecosystem:${NC}"
        echo ""
        echo "  [1] Check Ecosystem Health & Status"
        echo "  [2] Deploy / Clone All Ecosystem Resources"
        echo "  [3] Synchronize All Resources from Git"
        echo "  [4] Validate JavaScript Syntax (node --check)"
        echo "  [5] Purge Server Cache"
        echo "  [0] Exit"
        echo ""
        read -rp "Enter selection (0-5): " choice
        case "$choice" in
            1) show_banner; test_prerequisites; get_status ;;
            2) show_banner; deploy_ecosystem ;;
            3) show_banner; sync_ecosystem ;;
            4) show_banner; test_syntax ;;
            5) show_banner; clean_cache ;;
            *) exit 0 ;;
        esac
        ;;
esac
