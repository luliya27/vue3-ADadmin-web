// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'  // 使用 Pinia 作為狀態管理 (全域設定)
import App from './App.vue'
import router from './router'
import './style.css'
// 看你專案有沒有這個檔，可調整 (vue3-ADadmin/src/style.css)

const app = createApp(App)
app.use(createPinia()) // 註冊 Pinia
app.use(router)
app.mount('#app')
