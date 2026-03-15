# Docker 鏡像分發指南

## 📌 為什麼 tar 檔案不在 Git 中？

`Docker發佈/image/*.tar` 檔案（通常 200+ MB）**不應該**提交到 Git，原因如下：

| 因素 | 說明 |
|------|------|
| **檔案大小限制** | GitHub 單一檔案限制 100MB，tar 包通常 200-300MB |
| **儲存浪費** | 每次構建都是新檔案，Git 歷史會持續增長 |
| **構建的自動化** | 應該透過 `publish.py` 在部署時動態生成，而非存儲在版本控制中 |

## ✅ 推薦做法

### 方案 A：使用 GitHub Releases（推薦用於版本發佈）

將編譯後的 tar 檔案上傳到 GitHub Releases：

```bash
# 1. 構建並打包鏡像
cd Docker發佈
python3 publish.py --save --version 1.0.0

# 2. 上傳到 GitHub 的 Release 頁面
# https://github.com/luliya27/vue3-ADadmin-web/releases/new
# - 上傳 image/vue3-ADadmin-web_2026-03-15_1.0.0.tar
# - 編寫 Release 說明
```

### 方案 B：Docker Hub 分發（推薦用於自動部署）

將映像推送到 Docker Hub，無需保存 tar 檔案：

```bash
# 登入 Docker Hub
docker login

# 推送映像
cd Docker發佈
python3 publish.py --push --tag-prefix luliya27 --version 1.0.0

# 部署時直接 pull
docker-compose pull
docker-compose up -d
```

### 方案 C：內部文件服務器（推薦用於企業部署）

在公司內部文件服務器存放 tar 檔案：

```bash
# 1. 構建打包
python3 publish.py --save

# 2. 上傳到內部服務器
scp Docker發佈/image/*.tar admin@fileserver:/exports/docker-images/

# 3. 部署端下載並載入
wget https://fileserver/docker-images/vue3-ADadmin-web_2026-03-15.tar
docker load -i vue3-ADadmin-web_2026-03-15.tar
docker-compose up -d
```

## 🔄 CI/CD 工作流程建議

```yaml
# GitHub Actions 例子
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          cd Docker發佈
          python3 publish.py --save --version ${{ github.ref_name }}
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: Docker發佈/image/*.tar
```

## 📋 .gitignore 規則

`.gitignore` 已設定排除以下項目：

```
# Docker 打包檔案
Docker發佈/image/
Docker部署/logs/

# 資料庫
*.db
*.db-shm
*.db-wal

# 依賴
node_modules/
package-lock.json

# 構建輸出
dist/
build/
```

## 🚀 快速參考

### 本地開發 - 同步代碼到 GitHub

```bash
git add .                          # 添加所有更改（image 目錄被忽略）
git commit -m "feat: description"  # 提交
git push origin main               # 推送
```

### 發佈版本 - 帶 Docker 映像

```bash
# 方式 1：GitHub Releases
cd Docker發佈
python3 publish.py --save --version 1.0.0
# 手動上傳到 Release 頁面

# 方式 2：Docker Hub
python3 publish.py --push --tag-prefix luliya27 --version 1.0.0
```

### 部署 - 從分發源拉取

```bash
# 方式 1：從 GitHub Release 下載
wget https://github.com/luliya27/vue3-ADadmin-web/releases/download/v1.0.0/vue3-ADadmin-web_2026-03-15_1.0.0.tar
docker load -i vue3-ADadmin-web_*.tar

# 方式 2：從 Docker Hub pull
cd Docker部署
# 修改 docker-compose.yml 使用 luliya27/adadmin-api:1.0.0
docker-compose pull
docker-compose up -d
```

## 💾 遠程儲存設定

### 設定 GitHub Releases 下載 URL

編輯 `Docker部署/docker-compose.yml`，添加初始化腳本：

```yaml
services:
  api:
    build: ...
    environment:
      - DOWNLOAD_URL=https://github.com/luliya27/vue3-ADadmin-web/releases/download/${VERSION}/
```

### 自訂部署腳本

創建 `deploy.sh` 用於快速部署：

```bash
#!/bin/bash
VERSION=${1:-latest}

# 下載映像
if [[ "$VERSION" != "local" ]]; then
  wget https://github.com/luliya27/vue3-ADadmin-web/releases/download/v${VERSION}/vue3-ADadmin-web_*.tar
  docker load -i vue3-ADadmin-web_*.tar
  rm vue3-ADadmin-web_*.tar
fi

# 啟動服務
cd Docker部署
docker-compose up -d

echo "✅ 部署完成 - 訪問 http://localhost:8000"
```

---

**記住：** 隻有 *源代碼* 和 *配置文件* 應該在 Git 中，*編譯產物* 應該透過 CI/CD 流程管理。
