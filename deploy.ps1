<#
.SYNOPSIS
    AdminApp -> Synology NAS 배포 스크립트 (tar + scp + docker compose).
    NAS는 git 저장소가 아니므로, 로컬 소스를 압축해 전송 후 컨테이너를 재빌드합니다.

.EXAMPLE
    .\deploy.ps1

.NOTES
    - 무인 SSH 키(~/.ssh/nas_admin_deploy)로 접속합니다. 키가 없으면 -KeyPath로 지정하세요.
    - DB(mariadb)는 docker named volume(mariadb_data)에 있어 app 재빌드 시 보존됩니다.
    - scp는 Synology sshd 호환을 위해 -O(레거시 프로토콜)를 사용합니다.
#>
param(
    [string]$NasUser     = "naeunyoon",
    [string]$NasHost     = "nas.intellicode.kr",
    [int]   $NasPort     = 22,
    [string]$NasRepoPath = "/volume1/docker/admin",
    [string]$KeyPath     = "$env:USERPROFILE\.ssh\nas_admin_deploy"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$tar = "AdminApp_update.tar.gz"
Write-Host "==> 소스 압축 ($tar, bin/obj 제외)" -ForegroundColor Cyan
if (Test-Path $tar) { Remove-Item $tar -Force }
tar czf $tar --exclude='AdminApp/bin' --exclude='AdminApp/obj' --exclude='AdminApp/.vs' AdminApp

Write-Host "==> NAS로 전송" -ForegroundColor Cyan
scp -O -i $KeyPath -o BatchMode=yes -o IdentitiesOnly=yes -P $NasPort $tar "${NasUser}@${NasHost}:$NasRepoPath/"
if ($LASTEXITCODE -ne 0) { throw "scp 실패" }

Write-Host "==> NAS에서 압축 해제 + 재빌드" -ForegroundColor Cyan
$remote = @"
export PATH=/usr/local/bin:/usr/bin:/bin:`$PATH
cd '$NasRepoPath' || exit 1
tar xzf $tar && echo extracted
docker compose up -d --build
docker compose ps
rm -f $tar
"@
ssh -i $KeyPath -o BatchMode=yes -o IdentitiesOnly=yes -p $NasPort "${NasUser}@${NasHost}" $remote

Remove-Item $tar -Force -ErrorAction SilentlyContinue
Write-Host "==> 완료. http://${NasHost}:3100 에서 확인하세요." -ForegroundColor Green
