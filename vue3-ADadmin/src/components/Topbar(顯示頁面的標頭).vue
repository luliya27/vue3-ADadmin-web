<template>
    <header class="topbar">
        <div class="topbar-left">
            <h1 class="topbar-title">{{ pageTitle }}</h1>
        </div>

        <div class="topbar-right">
            <span class="user-info">👤 {{ username || "未命名使用者" }}</span>
            <button class="logout-btn" @click="logout">登出</button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted } from 'vue'

// 取得 router 與 route 物件
const router = useRouter()
const route = useRoute()

const username = ref('')

onMounted(() => {
    username.value = localStorage.getItem('adadmin_username') || ''
})

const pageTitle = computed(() => {
    switch (route.name) {
        case 'Dashboard':
            return '總覽儀表板'
        case 'UserList':
            return '使用者管理'
        default:
            return 'AD 管理後台'
    }
})

const logout = () => {
    localStorage.removeItem('adadmin_token')
    localStorage.removeItem('adadmin_username')
    router.push({ name: 'Login' })
}
</script>

<style scoped>
.topbar {
    height: 56px;
    padding: 0 20px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(15, 23, 42, 0.98);
    position: sticky;
    top: 0;
    z-index: 10;
}

.topbar-title {
    font-size: 16px;
    font-weight: 500;
}

.topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
}

.user-info {
    opacity: 0.9;
}

.logout-btn {
    padding: 6px 10px;
    font-size: 13px;
    border-radius: 999px;
    border: 1px solid rgba(248, 250, 252, 0.2);
    background: transparent;
    color: #e5e7eb;
    cursor: pointer;
}

.logout-btn:hover {
    background: rgba(248, 250, 252, 0.06);
}
</style>
