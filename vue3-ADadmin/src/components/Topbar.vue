<template>
    <header class="topbar">
        <div class="topbar-left">
            <img v-if="logoUrl" :src="logoUrl" alt="System Logo" class="topbar-logo-img" />
            <div class="topbar-title-text">
                <div class="topbar-company">{{ companyname }}</div>
                <div class="topbar-unit">{{ teamname }}</div>
            </div>
        </div>

        <div class="topbar-right">
            <span class="user-info">👤 {{ username || '未命名使用者' }}</span>
            <button class="logout-btn" @click="logout">登出</button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdSettingsStore } from '@/stores/adSettings'

const router = useRouter()
const adSettingsStore = useAdSettingsStore()
const username = ref('')

onMounted(() => {
    adSettingsStore.init()
    username.value = localStorage.getItem('adadmin_username') || '未命名使用者'
})

const logoUrl = computed(() => adSettingsStore.logoUrl)
const companyname = computed(() => adSettingsStore.companyname)
const teamname = computed(() => adSettingsStore.teamname)

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

.topbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.topbar-logo-img {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: contain;
    background: #020617;
}

.topbar-title-text {
    display: flex;
    /* flex-direction: column; */
    gap: 10px;
}

.topbar-company {
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
}

.topbar-unit {
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
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
