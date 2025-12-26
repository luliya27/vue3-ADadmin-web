# vue3-ADadmin-web專案
此專案為 Active Directory 管理後台系統，前端採用 Vue 3 + TypeScript，後端為 Node.js/Express + SQLite3，支援組織單位、使用者、群組等 AD 物件的 CRUD 操作，並提供登入認證、權限控管、即時統計儀表板等功能。前後端分離設計，API 介面清晰，適合中小型企業或教育單位內部資訊管理。

# 專案開發-目錄結構
```
vue3-ADadmin-web/
├── 0.專案需求/                    # 專案需求與架構規劃文件
├── 1.需求分析/                    # 需求分析與專案樹
├── 2.開發流程/                    # 開發引導、環境建置、API 串接說明
├── ADadmin-api/                   # 後端 Node.js/Express + SQLite3 API 專案
│   ├── server.js                  # Express 主伺服器程式（API 路由、中介層）
│   ├── adadmin.db                 # SQLite 資料庫檔案（使用者、群組、OU、電腦等資料）
│   ├── sql/                       # 資料庫初始化 SQL 腳本（建表、假資料）
│   │   ├── init_user_lists.sql    # 使用者表初始化
│   │   ├── init_groups.sql        # 群組表初始化
│   │   ├── init_ous.sql           # 組織單位表初始化
│   │   └── init_computers.sql     # 電腦表初始化
│   ├── uploads/                   # 上傳檔案存放目錄
│   │   ├── syslogo/               # 系統 Logo 圖片
│   │   └── sysbackgroundimg/      # 系統背景圖片
│   ├── package.json               # 後端依賴與腳本設定
│   └── package-lock.json          # 後端依賴版本鎖定
├── vue3-ADadmin/                  # 前端 Vue 3 + TypeScript 專案
│   ├── src/                       # 原始碼目錄
│   │   ├── components/            # 可重複使用的 Vue 元件（Modal、表單、確認對話框等）
│   │   ├── router/                # Vue Router 路由設定（頁面導航、路由守衛）
│   │   │   └── index.ts           # 路由配置主檔
│   │   ├── services/              # API 服務層（HTTP 請求封裝）
│   │   │   ├── http.ts            # Axios 實例與攔截器
│   │   │   └── adadmin.ts         # ADadmin API 介面定義
│   │   ├── stores/                # Pinia 狀態管理（全域狀態、使用者資訊）
│   │   ├── views/                 # 頁面元件（Dashboard、使用者管理、群組管理等）
│   │   ├── App.vue                # 根元件（含 Sidebar、Topbar 布局）
│   │   ├── main.ts                # 應用程式入口（Vue 實例、路由、狀態掛載）
│   │   └── style.css              # 全域樣式
│   ├── public/                    # 靜態資源目錄（不經 Webpack 處理）
│   │   └── favicon.png            # 網站圖標
│   ├── index.html                 # HTML 入口檔（SPA 單頁應用基底）
│   ├── package.json               # 前端依賴與腳本設定
│   ├── package-lock.json          # 前端依賴版本鎖定
│   ├── tsconfig.app.json          # TypeScript 應用程式設定（src 目錄型別檢查）
│   ├── tsconfig.json              # TypeScript 主設定檔（多專案引用）
│   ├── tsconfig.node.json         # TypeScript Node 環境設定（Vite 設定檔用）
│   └── vite.config.ts             # Vite 建置工具設定（代理、別名、插件）
└── README.md                    # 專案說明文件
```

## 核心功能說明

### 前端 (Vue3-ADadmin) 功能
- ✅ 登入認證系統（localStorage token 存儲）
- ✅ 路由保護（requiresAuth 守門機制）
- ✅ 響應式布局（Sidebar + Topbar）
- ✅ 使用者列表查詢、篩選、搜尋
- ✅ API 層服務化（http.ts + adadmin.ts）

### 後端 (ADadmin-api) 功能
- ✅ SQLite 資料庫存儲使用者資料
- ✅ 自動初始化資料庫表格與假資料
- ✅ 登入認證 API（更新登入時間）
- ✅ 使用者清單 API
- ✅ CORS 支持跨域請求

## 技術棧

**前端:**
- Vue 3 (Composition API)
- TypeScript
- Vite (快速開發伺服器)
- Vue Router (路由管理)
- Axios (HTTP 客戶端)

**後端:**
- Node.js / Express
- SQLite3 (輕量級資料庫)
- CORS (跨域資源共享)

## 部署配置

- **前端伺服器:** http://localhost:5173 (Vite dev server)
- **後端伺服器:** http://localhost:3001 (Express)
- **環境變數:** 前端 `.env` 配置 VITE_API_BASE_URL