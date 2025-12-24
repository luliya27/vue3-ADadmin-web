<template>
    <div class="layout-root" :style="backgroundStyle">
        <!-- 左側 Sidebar -->
        <Sidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />

        <!-- 主內容區 -->
        <div class="main-area">
            <!-- 上方 Topbar -->
            <Topbar />

            <!-- 各頁面內容 -->
            <main class="content">
                <RouterView />
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import Topbar from '@/components/Topbar.vue'
import { useAdSettingsStore } from '@/stores/adSettings'

const adSettingsStore = useAdSettingsStore()
const sidebarCollapsed = ref(false)

onMounted(() => {
    adSettingsStore.init()
})

const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
}

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
        backgroundAttachment: 'fixed',
    }
})
</script>

<style scoped>
.layout-root {
    display: flex;
    min-height: 100vh;
    background: #020617;
    color: #e5e7eb;
}

.main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.content {
    flex: 1;
    padding: 16px 20px 20px;
    overflow: auto;
    background: rgba(2, 8, 37, 0.722);
}
</style>