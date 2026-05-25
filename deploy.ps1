<#
.SYNOPSIS
    NAS(Synology Docker) 배포 스크립트.
    로컬에서 GitHub에 push한 뒤, NAS에 SSH로 접속해 git pull + docker compose 재빌드를 실행합니다.

.EXAMPLE
    .\deploy.ps1 -NasUser naeunyoon -NasHost nas.intellicode.kr -NasRepoPath /volume1/docker/admin

.NOTES
    - SSH 인증이 동작해야 합니다(비밀번호 또는 SSH 키). 비밀번호 인증 시 실행 중 1회 입력합니다.
    - DSM에서 SSH 서비스가 켜져 있어야 합니다(Control Panel → Terminal & SNMP → Enable SSH service).
    - NAS에 docker compose v2가 있어야 합니다. 구버전이면 'docker-compose'로 바꾸세요.
#>
param(
    [string]$NasUser     = "naeunyoon",
    [string]$NasHost     = "nas.intellicode.kr",
    [int]   $NasPort     = 22,
    [string]$NasRepoPath = "/volume1/docker/admin",   # NAS에 git clone된 경로로 수정
    [string]$Branch      = "master",
    [switch]$SkipPush                                  # 이미 push 했으면 -SkipPush
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $SkipPush) {
    Write-Host "==> 로컬 변경 push (origin/$Branch)" -ForegroundColor Cyan
    git push origin $Branch
}

# NAS에서 실행할 명령: 최신 코드 받고 컨테이너 재빌드 + 기동
$remote = @"
set -e
cd '$NasRepoPath'
git fetch --all
git reset --hard origin/$Branch
docker compose up -d --build
docker compose ps
"@

Write-Host "==> NAS($NasUser@$NasHost:$NasPort)에서 재배포 실행" -ForegroundColor Cyan

# ssh가 PATH에 있으면 ssh, 없으면 plink 사용
$ssh = Get-Command ssh -ErrorAction SilentlyContinue
if ($ssh) {
    $remote | & ssh -p $NasPort "$NasUser@$NasHost" "bash -s"
} else {
    $plink = "C:\Program Files\PuTTY\plink.exe"
    $remote | & $plink -ssh -P $NasPort "$NasUser@$NasHost" "bash -s"
}

Write-Host "==> 완료. http://$NasHost`:3100 에서 확인하세요." -ForegroundColor Green
