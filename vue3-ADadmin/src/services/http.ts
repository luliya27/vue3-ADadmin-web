// src/services/http.ts
import axios from 'axios'

const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: 10000,
})

// 自動帶上 token（如果有）
http.interceptors.request.use((config) => {
    const token = localStorage.getItem('adadmin_token')
    if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default http
// 之後你只要在 .env 設：
// VITE_API_BASE_URL=http://localhost:3001
// 部署到正式機就改這個環境變數即可。