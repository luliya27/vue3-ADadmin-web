<template>
    <aside class="sidebar" :class="{ 'sidebar--collapsed': props.collapsed }">
        <!-- Logo 區 -->
        <div class="sidebar-logo">
            <span class="logo-dot"></span>
            <span v-if="!props.collapsed" class="logo-text">AD Admin</span>
        </div>

        <!-- 選單 -->
        <nav class="sidebar-menu">
            <!-- Dashboard -->
            <button class="menu-item" :class="{ active: currentRouteName === 'Dashboard' }" @click="goTo('Dashboard')">
                <span class="menu-icon">📊</span>
                <span v-if="!props.collapsed" class="menu-label">Dashboard</span>

                <!-- 收合狀態下的 tooltip -->
                <span v-if="props.collapsed" class="menu-tooltip">
                    Dashboard
                </span>
            </button>

            <!-- 使用者管理 -->
            <button class="menu-item" :class="{ active: currentRouteName === 'UserList' }" @click="goTo('UserList')">
                <span class="menu-icon">👥</span>
                <span v-if="!props.collapsed" class="menu-label">使用者管理</span>

                <!-- 收合狀態下的 tooltip -->
                <span v-if="props.collapsed" class="menu-tooltip">
                    使用者管理
                </span>
            </button>
        </nav>

        <!-- 開闔按鈕 -->
        <button class="collapse-btn" @click="emit('toggle')">
            <span v-if="props.collapsed">&gt;</span>
            <span v-else>&lt;</span>
        </button>
    </aside>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const props = withDefaults(
    defineProps<{
        collapsed?: boolean
    }>(),
    {
        collapsed: false,
    },
)

const emit = defineEmits<{
    (e: 'toggle'): void
}>()

const router = useRouter()
const route = useRoute()

const currentRouteName = computed(() => route.name as string | undefined)

const goTo = (name: string) => {
    if (route.name === name) return
    router.push({ name })
}
</script>

<style scoped>
.sidebar {
    position: relative;
    width: 220px;
    background: #020617;
    border-right: 1px solid rgba(148, 163, 184, 0.3);
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    transition: width 0.2s ease;
}

.sidebar--collapsed {
    width: 30px;
}

/* Logo */
.sidebar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 16px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.3);
    margin-bottom: 16px;
}

.logo-dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: radial-gradient(circle, #a855f7, #4f46e5);
}

.logo-text {
    font-size: 16px;
    font-weight: 600;
}

/* Menu */
.sidebar-menu {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 4px;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #cbd5f5;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
}

.menu-item:hover {
    background: rgba(148, 163, 184, 0.15);
}

.menu-item.active {
    background: linear-gradient(135deg,
            rgba(99, 102, 241, 0.16),
            rgba(147, 51, 234, 0.16));
    color: #e5e7eb;
}

.menu-icon {
    width: 20px;
    text-align: center;
}

.menu-label {
    white-space: nowrap;
}

/* Collapse button */
.collapse-btn {
    position: absolute;
    top: 50%;
    right: -10px;
    transform: translateY(-50%);
    width: 24px;
    height: 48px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.6);
    background: #020617;
    color: #e5e7eb;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.collapse-btn:hover {
    background: rgba(15, 23, 42, 0.9);
}

.menu-item {
  position: relative; /* 讓 tooltip 吃這個定位 */
}

/* Tooltip 外觀 */
.menu-tooltip {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(148, 163, 184, 0.8);
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.7);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 20;
}

/* 滑到按鈕時才顯示 tooltip */
.menu-item:hover .menu-tooltip {
  opacity: 1;
  transform: translateY(-50%) translateX(12px);
}

</style>
