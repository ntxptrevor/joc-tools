#!/usr/bin/env bash
set -euo pipefail

# JOC Tools Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/ntxptrevor/joc-tools/main/install.sh | bash

REPO="ntxptrevor/joc-tools"
BRANCH="main"
INSTALL_DIR="${JOC_TOOLS_DIR:-$HOME/joc-tools}"

info()  { printf '\033[1;34m[info]\033[0m  %s\n' "$*"; }
error() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; }

# --- pre-flight checks -------------------------------------------------------

command_exists() { command -v "$1" >/dev/null 2>&1; }

if command_exists git; then
    FETCH_METHOD="git"
elif command_exists curl; then
    FETCH_METHOD="curl"
elif command_exists wget; then
    FETCH_METHOD="wget"
else
    error "git, curl, or wget is required but none were found."
    exit 1
fi

# --- download -----------------------------------------------------------------

info "Installing JOC Tools to ${INSTALL_DIR} ..."

if [ -d "$INSTALL_DIR" ]; then
    info "Directory already exists. Updating ..."
    if [ -d "$INSTALL_DIR/.git" ]; then
        git -C "$INSTALL_DIR" pull origin "$BRANCH" --ff-only 2>/dev/null || {
            error "Git pull failed. Remove ${INSTALL_DIR} and re-run the installer."
            exit 1
        }
    else
        error "${INSTALL_DIR} exists but is not a git repo. Remove it and re-run."
        exit 1
    fi
else
    case "$FETCH_METHOD" in
        git)
            info "Cloning repository ..."
            git clone --depth 1 --branch "$BRANCH" \
                "https://github.com/${REPO}.git" "$INSTALL_DIR"
            ;;
        curl)
            info "Downloading archive (curl) ..."
            mkdir -p "$INSTALL_DIR"
            curl -fsSL "https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz" \
                | tar xz --strip-components=1 -C "$INSTALL_DIR"
            ;;
        wget)
            info "Downloading archive (wget) ..."
            mkdir -p "$INSTALL_DIR"
            wget -qO- "https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz" \
                | tar xz --strip-components=1 -C "$INSTALL_DIR"
            ;;
    esac
fi

# --- launch helper ------------------------------------------------------------

info "Installation complete!"
echo ""
echo "  Files installed to: ${INSTALL_DIR}"
echo ""
echo "  To open the app, run:"
echo ""

if command_exists python3; then
    echo "    cd ${INSTALL_DIR} && python3 -m http.server 8080"
elif command_exists python; then
    echo "    cd ${INSTALL_DIR} && python -m http.server 8080"
else
    echo "    Open ${INSTALL_DIR}/index.html in your browser"
fi

echo ""
echo "  Then visit: http://localhost:8080"
echo ""
