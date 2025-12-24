<!-- src/views/auth/LoginView.vue -->
<template>
    <div class="login-page" :style="backgroundStyle">
        <div class="login-card">
            <div class="login-header">
                <img v-if="logoUrl" :src="logoUrl" alt="System Logo" class="login-logo" />
                <div class="login-title">
                    <div class="login-company">{{ companyname }}</div>
                    <div class="login-unit">{{ teamname }}</div>
                </div>
            </div>
            <form @submit.prevent="handleSubmit">
                <div class="form-group">
                    <label for="username">帳號</label>
                    <input id="username" v-model.trim="form.username" type="text" placeholder="請輸入帳號"
                        autocomplete="username" />
                </div>

                <div class="form-group">
                    <label for="password">密碼</label>
                    <input id="password" v-model.trim="form.password" type="password" placeholder="請輸入密碼"
                        autocomplete="current-password" />
                </div>

                <p v-if="errorMessage" class="error">
                    {{ errorMessage }}
                </p>

                <button class="btn" type="submit" :disabled="loading">
                    <span v-if="!loading">登入</span>
                    <span v-else>登入中…</span>
                </button>

                <p class="hint">
                    測試帳密：<code>luliya / AD0227</code>
                </p>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/services/adadmin'
import { useAdSettingsStore } from '@/stores/adSettings'

const router = useRouter()
const adSettingsStore = useAdSettingsStore()

const form = reactive({
  username: '',
  password: '',
})

const loading = ref(false)
const errorMessage = ref('')

// 🔐 之後這裡可以換成呼叫 ADadmin-api /api/auth/login
// const FAKE_ACCOUNT = 'luliya'
// const FAKE_PASSWORD = 'AD0227'

// 初始化全局設定
onMounted(() => {
  adSettingsStore.init()
})

// 計算背景樣式
const backgroundStyle = computed(() => {
  const url = adSettingsStore.backgroundUrl
  if (!url) {
    return {}
  }
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
  }
})

const logoUrl = computed(() => adSettingsStore.logoUrl)
const companyname = computed(() => adSettingsStore.companyname)
const teamname = computed(() => adSettingsStore.teamname)

const handleSubmit = async () => {
  errorMessage.value = ''

  if (!form.username || !form.password) {
    errorMessage.value = '請輸入帳號與密碼'
    return
  }

  loading.value = true
  try {
    // 呼叫後端登入 API
    const res = await login({
      username: form.username,
      password: form.password,
    })

    if (res.success) {
      // 保存 token 和 username
      localStorage.setItem('adadmin_token', res.token)
      localStorage.setItem('adadmin_username', res.user.username)

      // 導向 Dashboard
      router.push({ name: 'Dashboard' })
    } else {
      errorMessage.value = '登入失敗'
    }
  } catch (err: any) {
    console.error(err)
    errorMessage.value = err.response?.data?.message || '帳號或密碼錯誤'
  } finally {
    loading.value = false
  }
}

// // 帳號密碼寫死測試用
// const handleSubmit = async () => {
//   errorMessage.value = ''

//   if (!form.username || !form.password) {
//     errorMessage.value = '請輸入帳號與密碼'
//     return
//   }

//   loading.value = true
//   try {
//     // 模擬後端驗證（目前先寫死）
//     if (form.username === FAKE_ACCOUNT && form.password === FAKE_PASSWORD) {
//       // 模擬拿到 token，之後改成後端回傳的 JWT
//       const fakeToken = 'fake-jwt-token'

//       localStorage.setItem('adadmin_token', fakeToken)
//       localStorage.setItem('adadmin_username', form.username)

//       // 導向 Dashboard
//       router.push({ name: 'Dashboard' })
//     } else {
//       errorMessage.value = '帳號或密碼錯誤'
//     }
//   } finally {
//     loading.value = false
//   }
// }
</script>

<style scoped>
.login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
}

.login-card {
    width: 360px;
    padding: 32px 28px;
    border-radius: 12px;
    background: rgba(2, 6, 23, 0.95);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.8);
    color: #e5e7eb;
}

.login-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

.login-logo {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    object-fit: contain;
    background: #020617;
}

.login-title {
    display: flex;
    flex-direction: column;
}

.login-company {
    font-size: 18px;
    font-weight: 600;
}

.login-unit {
    font-size: 12px;
    color: #9ca3af;
}

.form-group {
    margin-bottom: 16px;
}

label {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
}

input {
    width: 100%;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid #4b5563;
    background: #020617;
    color: #e5e7eb;
    outline: none;
    font-size: 14px;
    box-sizing: border-box;
}

input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.4);
}

input::placeholder {
    color: #6b7280;
}

.error {
    margin-top: 4px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #fca5a5;
}

.btn {
    width: 100%;
    padding: 9px 0;
    border: none;
    border-radius: 6px;
    background: #6366f1;
    color: white;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 4px;
}

.btn:hover {
    background: #4f46e5;
}

.btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.hint {
    margin-top: 12px;
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
}

code {
    background: rgba(15, 23, 42, 0.8);
    padding: 2px 4px;
    border-radius: 4px;
}
</style>
