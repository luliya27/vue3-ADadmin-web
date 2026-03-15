# CI/CD 自動化部署說明

## 概述
本專案使用 Docker Compose 進行容器化部署，支援自動化建置、打包和部署流程。打包腳本 `publish.py` 可自動處理前端建置、後端依賴安裝、Docker 鏡像建置，並可選保存鏡像為 tar 檔或推送至 registry。

## 前置需求
- Node.js (v18+)
- npm
- Docker & Docker Compose
- Python 3

## 專案結構
```
vue3-ADadmin-web/
├── vue3-ADadmin/          # 前端 Vue 3 專案
├── ADadmin-api/           # 後端 Node.js API
├── Docker部署/            # Docker Compose 配置
│   └── docker-compose.yml
└── Docker發佈/            # 打包與部署檔案
    ├── publish.py         # 打包腳本
    ├── Dockerfile.backend # 後端 Dockerfile
    ├── Dockerfile.frontend# 前端 Dockerfile
    └── image/             # 輸出目錄
```

## 手動部署流程

### 1. 本地建置與測試
```bash
# 前端建置
cd vue3-ADadmin
npm ci
npm run build

# 後端依賴
cd ../ADadmin-api
npm ci

# Docker 建置
cd ../Docker部署
docker-compose build
docker-compose up -d
```

### 2. 打包鏡像
```bash
cd Docker發佈
python3 publish.py --save
# 產生 vue3-ADadmin-web_YYYY-MM-DD.tar 在 image/ 目錄
```

### 3. 部署到生產環境
```bash
# 在生產伺服器上
docker load < vue3-ADadmin-web_YYYY-MM-DD.tar
docker-compose up -d
```

## CI/CD 流程建議

### 使用 GitHub Actions
建立 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Setup Docker
      run: |
        sudo apt-get update
        sudo apt-get install -y docker.io docker-compose

    - name: Build and Package
      run: |
        cd Docker發佈
        python3 publish.py --tag-prefix ${{ secrets.DOCKER_USERNAME }} --save --push

    - name: Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SERVER_KEY }}
        script: |
          cd /path/to/deployment
          docker-compose down
          docker load < vue3-ADadmin-web_$(date +%Y-%m-%d).tar
          docker-compose up -d
```

### 使用 Jenkins
1. 安裝必要外掛：Docker, Node.js
2. 建立 Pipeline 任務
3. 設定建置步驟：
   - 檢查程式碼
   - 安裝依賴
   - 執行 `publish.py --save`
   - 上傳 tar 檔至部署伺服器
   - 在伺服器執行部署

## 打包腳本使用說明

### 基本用法
```bash
python3 publish.py [選項]
```

### 選項
- `--tag-prefix PREFIX`: 鏡像標籤前綴 (預設: luliya27)
- `--save`: 保存鏡像為 tar 檔
- `--push`: 推送鏡像至 registry
- `--no-cache`: Docker 建置時不使用快取
- `--version VERSION`: 指定版本號

### 範例
```bash
# 建置並保存鏡像
python3 publish.py --save

# 建置並推送至 registry
python3 publish.py --tag-prefix myregistry.com/myapp --push

# 指定版本號
python3 publish.py --save --version 1.0.0
```

## 部署注意事項
1. 確保生產環境有足夠的磁碟空間
2. 設定適當的環境變數 (NODE_ENV=production)
3. 配置反向代理 (nginx) 處理前端靜態檔案
4. 設定資料庫持久化掛載
5. 監控容器日誌和資源使用

## 故障排除
- 建置失敗：檢查 Node.js 和 Docker 版本
- 鏡像推送失敗：確認 registry 認證
- 部署失敗：檢查網路連接和端口配置</content>
<parameter name="filePath">/Users/luliyaxiao/Project/vue3-ADadmin-web/Docker發佈/README_CICD.md
