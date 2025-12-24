<!-- <template>
    <div class="layout-root">
        <Sidebar :collapsed="isSidebarCollapsed" @toggle="toggleSidebar" />
        <div class="main-area">
            <Topbar />
            <main class="content">
                <RouterView />
            </main>
        </div>
    </div>
</template> -->
<template>
    <div class="app-layout" :style="backgroundStyle">
        <Sidebar />
        <div class="app-main">
            <Topbar />
            <main class="app-content">
                <router-view />
            </main>
        </div>
    </div>
</template>


<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Topbar from '@/components/Topbar.vue'
import { computed, onMounted } from 'vue'
import { useAdSettingsStore } from '@/stores/adSettings'

// Sidebar 的開闔狀態
// const isSidebarCollapsed = ref(false)
// 把初始值改成 true，Sidebar 就會在進入後台時預設是「縮起來」

// const toggleSidebar = () => {
//     isSidebarCollapsed.value = !isSidebarCollapsed.value
// }

// 使用者關閉側欄後 → 下次登入也維持閉合
const isSidebarCollapsed = ref(
    localStorage.getItem('sidebar_collapsed') === '1'
)

const toggleSidebar = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.value ? '1' : '0')
}

const adSettingsStore = useAdSettingsStore()
// 初始化設定
onMounted(() => {
    adSettingsStore.init()
})

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

</script>

<style scoped>
.app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(2px);
}

.app-content {
    background: rgba(15, 23, 42, 0.86);
}

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
}
</style>
