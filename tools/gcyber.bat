@echo off
setlocal
title G-CyberRPcore Orchestrator CLI
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0gcyber-deploy.ps1" %*
