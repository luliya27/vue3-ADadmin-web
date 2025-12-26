// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'  // 使用 Pinia 作為狀態管理 (全域設定)
import App from './App.vue'
import router from './router'
import './style.css'

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faUser, faUsers, faDesktop, faRightToBracket, faLock, faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons'

// 將需要的圖標加入 library
library.add(faUser, faUsers, faDesktop, faRightToBracket, faLock, faAngleLeft, faAngleRight)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon) // 註冊 FontAwesomeIcon 元件
app.use(createPinia()) // 註冊 Pinia
app.use(router)
app.mount('#app')
