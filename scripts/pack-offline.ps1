# ============================================================
# Document Workspace 1.6.5 离线打包脚本 (Windows PowerShell)
# ============================================================
# 用途：在 Windows 开发机上打包完整离线部署包
# 输出：document-workspace-1.6.5-offline.tar.gz
# ============================================================

$ErrorActionPreference = "Stop"
$VERSION = "1.6.5"
$PACKAGE_NAME = "document-workspace-$VERSION-offline"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Document Workspace $VERSION 离线打包工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# 检查 Docker
Write-Host "`n[1/6] 检查 Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if (-not $dockerVersion) {
    Write-Host "错误: Docker 未安装或未运行" -ForegroundColor Red
    exit 1
}
Write-Host "Docker 版本: $dockerVersion" -ForegroundColor Green

# 构建前端
Write-Host "`n[2/6] 构建前端静态文件..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 前端构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "前端构建完成" -ForegroundColor Green

# 构建 Docker 镜像
Write-Host "`n[3/6] 构建 Docker 镜像..." -ForegroundColor Yellow
docker build -t document-workspace:$VERSION .
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: Docker 镜像构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "Docker 镜像构建完成: document-workspace:$VERSION" -ForegroundColor Green

# 导出 Docker 镜像
Write-Host "`n[4/6] 导出 Docker 镜像..." -ForegroundColor Yellow
docker save document-workspace:$VERSION -o "document-workspace-$VERSION.tar"
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: Docker 镜像导出失败" -ForegroundColor Red
    exit 1
}
Write-Host "镜像已导出: document-workspace-$VERSION.tar" -ForegroundColor Green

# 创建离线包目录
Write-Host "`n[5/6] 创建离线部署包..." -ForegroundColor Yellow
$OFFLINE_DIR = "$PACKAGE_NAME"
if (Test-Path $OFFLINE_DIR) {
    Remove-Item -Recurse -Force $OFFLINE_DIR
}
New-Item -ItemType Directory -Path $OFFLINE_DIR | Out-Null

# 复制必要文件
Copy-Item "document-workspace-$VERSION.tar" "$OFFLINE_DIR/"
Copy-Item "docker-compose.yml" "$OFFLINE_DIR/"
Copy-Item "README.md" "$OFFLINE_DIR/"
Copy-Item -Recurse "data" "$OFFLINE_DIR/"
Copy-Item -Recurse "docs" "$OFFLINE_DIR/"
Copy-Item -Recurse "test" "$OFFLINE_DIR/"
Copy-Item -Recurse "dist" "$OFFLINE_DIR/"
Copy-Item "scripts/install.sh" "$OFFLINE_DIR/"

# 创建 .env 模板
@"
# Document Workspace 环境配置
# 复制此文件为 .env 并根据需要修改

# 服务端口
PORT=4300

# 大模型配置（可选，离线环境可不配置）
QWEN_ENDPOINT=
QWEN_MODEL=qwen-plus
QWEN_API_KEY=
"@ | Out-File -FilePath "$OFFLINE_DIR/.env.example" -Encoding UTF8

# 压缩打包
Write-Host "`n[6/6] 压缩离线部署包..." -ForegroundColor Yellow
tar -czvf "$PACKAGE_NAME.tar.gz" $OFFLINE_DIR

# 清理临时文件
Remove-Item -Recurse -Force $OFFLINE_DIR
Remove-Item "document-workspace-$VERSION.tar"

# 计算文件大小
$fileSize = (Get-Item "$PACKAGE_NAME.tar.gz").Length / 1MB
$fileSizeStr = "{0:N2}" -f $fileSize

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  打包完成!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "输出文件: $PACKAGE_NAME.tar.gz" -ForegroundColor White
Write-Host "文件大小: $fileSizeStr MB" -ForegroundColor White
Write-Host "`n部署步骤:" -ForegroundColor Cyan
Write-Host "1. 将 $PACKAGE_NAME.tar.gz 复制到目标 Linux 服务器"
Write-Host "2. 解压: tar -xzvf $PACKAGE_NAME.tar.gz"
Write-Host "3. 进入目录: cd $PACKAGE_NAME"
Write-Host "4. 执行安装: chmod +x install.sh && ./install.sh"
Write-Host "5. 访问: http://<服务器IP>:4300"
