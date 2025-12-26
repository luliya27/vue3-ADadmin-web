<template>
    <aside class="sidebar" :class="{ 'sidebar--collapsed': props.collapsed }">
        <!-- Logo 區 -->
        <div class="sidebar-logo">
            <span class="logo-dot"></span>
            <span v-if="!props.collapsed" class="logo-text">AD Admin</span>
        </div>

        <!-- 選單 -->
        <nav class="sidebar-menu">
            <template v-for="menu in menus" :key="menu.label">
                <!-- 沒有 children 的單層選單 -->
                <button v-if="!menu.children || menu.children.length === 0" class="menu-item"
                    :class="{ active: isMenuActive(menu) }" @click="menu.name && goTo(menu.name)">
                    <span class="menu-icon">{{ menu.icon }}</span>
                    <span v-if="!props.collapsed" class="menu-label">
                        {{ menu.label }}
                    </span>

                    <!-- 收合狀態下的 tooltip -->
                    <span v-if="props.collapsed" class="menu-tooltip">
                        {{ menu.label }}
                    </span>
                </button>

                <!-- 有 children 的多層選單群組 -->
                <div v-else class="menu-group">
                    <!-- 群組標題 -->
                    <button class="menu-item menu-item--group" :class="{ active: isMenuActive(menu) }"
                        @click="toggleGroup(menu)">
                        <span class="menu-icon">{{ menu.icon }}</span>
                        <span v-if="!props.collapsed" class="menu-label">
                            {{ menu.label }}
                        </span>

                        <!-- 收合狀態 tooltip（只顯示群組名稱） -->
                        <span v-if="props.collapsed" class="menu-tooltip">
                            {{ menu.label }}
                        </span>

                        <!-- 展開箭頭，只在展開模式顯示 -->
                        <span v-if="!props.collapsed" class="group-arrow"
                            :class="{ 'group-arrow--open': isGroupExpanded(menu) }">
                            ▾
                        </span>
                    </button>

                    <!-- 子選單：只在「側欄展開」時顯示 -->
                    <transition name="submenu">
                        <div v-if="!props.collapsed" v-show="isGroupExpanded(menu)" class="submenu">
                            <button v-for="child in menu.children" :key="child.name ?? child.label"
                                class="menu-item submenu-item" :class="{ active: isMenuActive(child) }"
                                @click="child.name && goTo(child.name)">
                                <span class="menu-icon submenu-icon">
                                    {{ child.icon }}
                                </span>
                                <span class="menu-label">
                                    {{ child.label }}
                                </span>
                            </button>
                        </div>
                    </transition>
                </div>
            </template>
        </nav>

        <!-- 開闔按鈕 -->
        <button class="collapse-btn" @click="emit('toggle')">
            <span v-if="props.collapsed">&gt;</span>
            <span v-else>&lt;</span>
        </button>
    </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/* ----- 型別定義 ----- */
interface MenuItem {
    name?: string          // 對應 router name（群組可以沒有）
    label: string          // 顯示文字
    icon?: string          // emoji / icon
    children?: MenuItem[]  // 子選單
}

/* ----- Props + Emits ----- */
const props = withDefaults(
    defineProps<{
        collapsed?: boolean
    }>(),
    {
        collapsed: true, // 預設收合
    },
)

const emit = defineEmits<{
    (e: 'toggle'): void
}>()

/* ----- LocalStorage 持久化側邊欄狀態 ----- */
const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'

// 監聽 collapsed 狀態變化，儲存到 localStorage
watch(
    () => props.collapsed,
    (newValue) => {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue))
    }
)

// 初始化時從 localStorage 讀取狀態並通知父組件
onMounted(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) {
        const isCollapsed = stored === 'true'
        // 如果儲存的狀態與當前 props 不同，發出 toggle 事件讓父組件同步
        if (isCollapsed !== props.collapsed) {
            emit('toggle')
        }
    }
})

/* ----- Router ----- */
const router = useRouter()
const route = useRoute()
const currentRouteName = computed(() => route.name as string | undefined)

/* ----- 多層選單定義（之後擴充只改這裡） ----- */
const menus: MenuItem[] = [
    {
        name: 'Dashboard',
        label: 'Dashboard',
        icon: '📊',
    },
    {
        label: 'AD 管理',
        icon: '🧩',
        children: [
            {
                name: 'UserList',
                label: '使用者管理',
                icon: '👥',
            },
            {
                name: 'GroupList',
                label: '群組管理',
                icon: '👤',
            }, {
                name: 'OuTree',
                label: '組織單位管理',
                icon: '🗂️',
            }, {
                name: 'ComputerList',
                label: '電腦管理',
                icon: '💻',
            }
        ],
    },
    {
        name: 'SettingsAd',
        label: '系統設定',
        icon: '⚙️',
    }
]

/* ----- 群組展開狀態 ----- */
const expandedGroups = ref<Record<string, boolean>>({
    // 預設 AD 管理是展開的
    'AD 管理': true,
})

const groupKey = (menu: MenuItem) => menu.label

const isGroupExpanded = (menu: MenuItem) => {
    const key = groupKey(menu)
    const map = expandedGroups.value
    // 沒設定的群組預設展開
    return map[key] !== false
}

const toggleGroup = (menu: MenuItem) => {
    const key = groupKey(menu)
    expandedGroups.value[key] = !isGroupExpanded(menu)
}

/* ----- 判斷目前 route 是否在這個 menu/child 底下 ----- */
const isRouteActive = (name?: string) => {
    if (!name) return false
    return currentRouteName.value === name
}

const isMenuActive = (menu: MenuItem): boolean => {
    if (isRouteActive(menu.name)) return true
    if (menu.children && menu.children.length > 0) {
        return menu.children.some((child) => isRouteActive(child.name))
    }
    return false
}

/* ----- 導頁 ----- */
const goTo = (name: string) => {
    if (currentRouteName.value === name) return
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
}

.menu-group {
    display: flex;
    flex-direction: column;
}

/* 一般 menu 按鈕 */
.menu-item {
    position: relative;
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

/* 群組 header */
.menu-item--group {
    justify-content: space-between;
}

/* icon / label */
.menu-icon {
    width: 20px;
    text-align: center;
}

.menu-label {
    white-space: nowrap;
}

/* 群組箭頭 */
.group-arrow {
    margin-left: auto;
    font-size: 12px;
    opacity: 0.8;
    transition: transform 0.15s ease;
}

.group-arrow--open {
    transform: rotate(180deg);
}

/* 子選單區塊 */
.submenu {
    margin-left: 4px;
    padding-left: 8px;
    border-left: 1px solid rgba(148, 163, 184, 0.3);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.submenu-item {
    padding-left: 4px;
    font-size: 13px;
}

.submenu-icon {
    font-size: 13px;
}

/* 子選單展開動畫 */
.submenu-enter-active,
.submenu-leave-active {
    transition: all 0.15s ease;
}

.submenu-enter-from,
.submenu-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

/* Tooltip */
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
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.7);
    transition: opacity 0.15s ease, transform 0.15s ease;
    z-index: 50;
}

.menu-item:hover .menu-tooltip {
    opacity: 1;
    transform: translateY(-50%) translateX(12px);
}

/* Sidebar collapse button */
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
</style>
