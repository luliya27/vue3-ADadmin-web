# vue3-ADadmin-web 容器化發佈說明

## 📋 概述

本目錄包含 `vue3-ADadmin-web` 專案的完整容器化部署方案，包括 Dockerfile、docker-compose 配置和自動化發佈腳本。

**主要組件：**
- **Dockerfile.backend** - Express.js API 後端容器
- **Dockerfile.frontend** - Vue 3 SPA 前端容器
- **publish.py** - 自動化構建、打包、發佈腳本

---

## 🚀 快速開始

### 前置要求

- Docker & Docker Compose (最新版)
- Python 3.7+
- macOS / Linux / Windows (需要 WSL2)

### 一鍵部署

#### 方式 1: 本地開發環境

```bash
# 在 vue3-ADadmin-web 專案根目錄執行
cd Docker部署
docker-compose up -d

# 驗證服務
curl http://localhost:8000        # 前端
curl http://localhost:3001/api/adsettings  # 後端 API
```

訪問地址：
- **前端**: http://localhost:8000
- **後端 API**: http://localhost:3001
- **登入帳號**: luliya / AD0227 (測試用戶)

#### 方式 2: 完整構建和打包

```bash
# 在 Docker發佈 目錄執行
cd Docker發佈

# 1. 構建映像並保存為 tar 檔案
python3 publish.py --save

# 2. 或快速打包現有映像（無需重新構建）
python3 publish.py --no-build --save
```

---

## 📦 publish.py 使用說明

自動化部署腳本，支持多種操作模式。

### 基本用法

```bash
python3 publish.py [OPTIONS]
```

### 選項

| 選項 | 說明 | 預設值 |
|------|------|--------|
| `--no-build` | 跳過前端/後端構建，只打包現有映像 | 否 |
| `--save` | 將構建的映像保存為 tar 檔案 | 否 |
| `--push` | 將映像推送到 Docker Registry | 否 |
| `--tag-prefix PREFIX` | 映像標籤前綴 (用戶名或倉庫) | `luliya27` |
| `--version VERSION` | 版本號，附加到 tar 檔名 | 日期 (YYYY-MM-DD) |

### 常用場景

**場景 1: 本地開發 - 完整重新構建**
```bash
python3 publish.py --save
```
輸出：`Docker發佈/image/vue3-ADadmin-web_2026-03-15.tar` (231MB)

**場景 2: 部署前 - 快速打包**
```bash
# 節省時間，只打包現有映像 (無需 npm 構建)
python3 publish.py --no-build --save
```

**場景 3: 發布到 Docker Hub**
```bash
python3 publish.py --push --tag-prefix YOUR_USERNAME
```
這會將映像標籤為：
- `YOUR_USERNAME/adadmin-api:latest`
- `YOUR_USERNAME/vue3-adadmin:latest`

**場景 4: 帶版本號的發佈**
```bash
python3 publish.py --save --version 1.0.0
```
輸出：`vue3-ADadmin-web_2026-03-15_1.0.0.tar`

---

## 📂 文件結構

```
Docker發佈/
├── README.md                    # 本檔案
├── publish.py                   # 自動化發佈腳本 ⭐
├── Dockerfile.backend           # 後端容器定義
├── Dockerfile.frontend          # 前端容器定義
└── image/                       # 輸出目錄
    └── vue3-ADadmin-web_*.tar   # 打包後的映像

Docker部署/
├── docker-compose.yml           # 服務編排配置 ⭐
└── logs/                        # 日誌目錄 (可選)
```

---

## 🐳 Docker Compose 配置

### 服務架構

```yaml
services:
  api:                          # Express.js 後端
    - 端口: 3001:3000           # 外部:內部
    - 環境: NODE_ENV=production
    - 資料庫: /app/db/adadmin.db (掛載自 ../ADadmin-api)
  
  frontend:                     # Vue 3 前端 (nginx)
    - 端口: 8000:80
    - 依賴: api 服務
```

### 手動啟動/停止

```bash
cd Docker部署

# 啟動服務
docker-compose up -d

# 查看狀態
docker-compose ps

# 查看日誌
docker-compose logs -f api      # 後端日誌
docker-compose logs -f frontend # 前端日誌

# 停止服務
docker-compose down

# 重建映像 (無快取)
docker-compose build --no-cache
```

---

## 💾 部署分發

### 方法 1: 使用 tar 檔案 (推薦用於本地部署)

**打包側 (開發機器):**
```bash
cd Docker發佈
python3 publish.py --save
# 輸出: image/vue3-ADadmin-web_2026-03-15.tar (231MB)
```

**部署側 (伺服器):**
```bash
# 上傳 tar 檔案到伺服器
scp vue3-ADadmin-web_2026-03-15.tar user@server:/opt/

# 在伺服器上載入映像
docker load -i vue3-ADadmin-web_2026-03-15.tar

# 啟動服務
cd vue3-ADadmin-web/Docker部署
docker-compose up -d
```

### 方法 2: 使用 Docker Hub (推薦用於雲端部署)

**推送映像:**
```bash
cd Docker發佈
python3 publish.py --push --tag-prefix luliya27
# → luliya27/adadmin-api:latest
# → luliya27/vue3-adadmin:latest
```

**部署側 docker-compose.yml:**
```yaml
services:
  api:
    image: luliya27/adadmin-api:latest
    # ... 其他配置
  
  frontend:
    image: luliya27/vue3-adadmin:latest
    # ... 其他配置
```

---

## 🔧 環境配置

### API 服務 (3001)

| 環境變數 | 預設值 | 說明 |
|---------|--------|------|
| `NODE_ENV` | production | 執行環境 |
| `PORT` | 3000 | 內部端口 |
| `DB_PATH` | /app/db/adadmin.db | SQLite 資料庫路徑 |

### 前端服務 (8000)

| 環境變數 | 預設值 | 說明 |
|---------|--------|------|
| `VITE_API_BASE_URL` | http://localhost:3001 | API 端點 (構建時注入) |

**修改 API 端點:**

編輯 `Docker部署/docker-compose.yml`:
```yaml
frontend:
  build:
    args:
      VITE_API_BASE_URL: https://api.production.com  # 自訂 API 地址
```

重新構建：
```bash
cd Docker部署
docker-compose build --no-cache frontend
docker-compose up -d
```

---

## ✅ 驗證清單

部署後，確保以下項目正常：

```bash
# 1. 容器運行
docker-compose ps
# 應顯示 adadmin-api 和 adadmin-frontend 都在 Running 狀態

# 2. 前端頁面
curl -s http://localhost:8000 | grep -o "<title>.*</title>"
# 應輸出: <title>AD Admin</title>

# 3. 後端 API
curl -s http://localhost:3001/api/adsettings | jq .success
# 應輸出: true

# 4. 數據庫
curl -s http://localhost:3001/api/users | jq '.data | length'
# 應輸出: 用戶數量 (>0)

# 5. 日誌檢查
docker-compose logs api | grep "✅"
# 應顯示: ✅ 已連線到 SQLite 資料庫
```

---

## 🐛 故障排除

### 問題 1: 前端 API 連線失敗 (ERR_CONNECTION_REFUSED)

**原因**: API 端點設定錯誤

**解決方案**:
```bash
# 檢查 API 是否運行
curl http://localhost:3001/api/adsettings

# 如果失敗，重建前端映像：
cd Docker部署
docker-compose build --no-cache frontend
docker-compose restart frontend
```

### 問題 2: 資料庫表不存在 (SQLITE_ERROR: no such table)

**原因**: 資料庫初始化失敗

**解決方案**:
```bash
# 重新初始化資料庫
rm -f ADadmin-api/db/adadmin.db*
cd Docker部署
docker-compose down
docker-compose up -d
```

### 問題 3: 連接埠已被佔用

**原因**: 連接埠 3001 或 8000 被其他程式使用

**解決方案**:
```bash
# 檢查佔用的程式
lsof -i :3001    # 後端
lsof -i :8000    # 前端

# 修改 docker-compose.yml 的連接埠
# 將 "8000:80" 改為 "9000:80"
# 將 "3001:3000" 改為 "3002:3000"
```

### 問題 4: 映像大小過大

**原因**: 包含多個未優化的層

**解決方案**:
```bash
# 使用 --no-build 快速打包 (省略中間層)
python3 publish.py --no-build --save

# 或清理未使用的映像
docker image prune -a
docker system prune -a
```

---

## 📊 效能參數

| 組件 | CPU | 記憶體 | 磁碟 |
|------|-----|--------|------|
| API 映像 | 1x 核心 | 256MB | 187MB |
| 前端映像 | 0.5x 核心 | 128MB | 81.7MB |
| 總體系統 | 2x 核心 | 512MB+ | 300MB |

---

## 📚 進階使用

### 構建自訂版本

修改 Dockerfile 後重新構建：
```bash
cd Docker部署
docker-compose build --no-cache api    # 只構建後端
docker-compose build --no-cache frontend # 只構建前端
```

### 連接容器內部 shell

```bash
# API 容器
docker-compose exec api sh

# 前端容器
docker-compose exec frontend sh
```

### 持續交付 (CI/CD)

使用 publish.py 與 GitHub Actions 或 Jenkins:
```bash
# 自動化構建和推送
python3 publish.py --push --tag-prefix myrepo --version 1.0.0
```

---

## 📞 支援與反饋

如遇到問題，請檢查：
1. Docker 版本 (`docker --version`)
2. Docker Compose 版本 (`docker-compose --version`)
3. 磁碟空間 (`df -h`)
4. 網路連線 (`docker pull alpine`)

---

## 📝 版本歷史

| 版本 | 日期 | 說明 |
|------|------|------|
| 1.0.0 | 2026-03-15 | 初始發佈 |
| | | - Dockerfile 最佳實踐 |
| | | - 自動化 publish.py 腳本 |
| | | - SQLite 資料庫初始化 |
| | | - 前端 nginx SPA 路由 |

---

**祝部署順利！** 🎉
