<template>
    <div class="group-list-page">
        <!-- Toolbar -->
        <section class="toolbar">
            <div class="title-block">
                <h2>群組管理</h2>
                <p class="subtitle">
                    顯示 AD 群組清單，目前以 SQLite 假資料開發，後續可改為實際 AD 同步。
                </p>
            </div>

            <div class="toolbar-actions">
                <!-- chip 分類篩選功能 -->
                <!-- <div class="type-filters">
                    <button v-for="item in typeOptions" :key="item.value" class="type-chip"
                        :class="{ active: typeFilter === item.value }" @click="typeFilter = item.value">
                        {{ item.label }}
                    </button>
                </div>

                <div class="search-box">
                    <input v-model.trim="keyword" type="text" placeholder="搜尋群組名稱 / 描述" @keyup.enter="loadGroups" />
                    <button class="search-btn" @click="loadGroups">
                        搜尋
                    </button>
                </div> -->
                <div class="type-filters">
                    <button v-for="item in typeOptions" :key="item.value" class="type-chip"
                        :class="{ active: typeFilter === item.value }" @keyup.click="typeFilter = item.value">
                        {{ item.label }}
                    </button>
                </div>

                <div class="search-box">
                    <input v-model.trim="keyword" type="text" placeholder="搜尋群組名稱 / 描述" @keyup.enter="loadGroups" />
                    <button class="search-btn" @keyup.click="loadGroups">
                        搜尋
                    </button>
                </div>
            </div>
        </section>

        <!-- Table -->
        <section class="table-wrapper">
            <div class="table-header">
                <span v-if="loading" class="loading">載入中...</span>
                <span v-else class="count">共 {{ groups.length }} 筆群組</span>
                <span v-if="errorMessage" class="error">{{ errorMessage }}</span>
            </div>

            <table class="group-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">ID</th>
                        <th>群組名稱</th>
                        <th>描述</th>
                        <th style="width: 120px;">類型</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="groups.length === 0 && !loading">
                        <td colspan="4" class="empty">目前沒有符合條件的群組</td>
                    </tr>

                    <tr v-for="group in groups" :key="group.id">
                        <td class="mono">{{ group.id }}</td>
                        <td class="mono">{{ group.name }}</td>
                        <td>{{ group.description || '-' }}</td>
                        <td>
                            <span class="type-pill" :class="group.type">
                                {{ typeLabel(group.type) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </div>
</template>

<script setup lang="ts">
// import { ref, onMounted } from 'vue'
import { ref, onMounted, watch } from 'vue'
import type { Group, GroupType } from '@/services/adadmin'
import { fetchGroups } from '@/services/adadmin'

const groups = ref<Group[]>([])
const loading = ref(false)
const errorMessage = ref('')

const keyword = ref('')
const typeFilter = ref<GroupType | 'all'>('all')

const typeOptions: { label: string; value: GroupType | 'all' }[] = [
    { label: '全部類型', value: 'all' },
    { label: '安全性群組', value: 'security' },
    { label: '通訊群組', value: 'distribution' },
    { label: '組織群組', value: 'org' },
    { label: '其他', value: 'other' },
]

const typeLabel = (type: GroupType) => {
    switch (type) {
        case 'security':
            return '安全性群組'
        case 'distribution':
            return '通訊群組'
        case 'org':
            return '組織群組'
        case 'other':
            return '其他'
        default:
            return type
    }
}

const loadGroups = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
        groups.value = await fetchGroups({
            q: keyword.value || undefined,
            type: typeFilter.value,
        })
    } catch (err) {
        console.error('loadGroups error >>>', err)
        errorMessage.value = '載入群組清單失敗'
    } finally {
        loading.value = false
    }
}

// 類型 chip 變動 → 自動載入新資料
watch(typeFilter, () => {
  loadGroups()
})

onMounted(() => {
    loadGroups()
})
</script>

<style scoped>
.group-list-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* Toolbar */
.toolbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
}

.title-block h2 {
    margin: 0 0 4px;
    font-size: 18px;
}

.subtitle {
    margin: 0;
    font-size: 12px;
    color: #9ca3af;
}

.toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
}

.type-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.type-chip {
    padding: 4px 10px;
    font-size: 12px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: transparent;
    color: #e5e7eb;
    cursor: pointer;
}

.type-chip.active {
    border-color: #6366f1;
    background: radial-gradient(circle at top left, #4f46e5, #7c3aed);
}

.search-box {
    display: flex;
    align-items: center;
    gap: 6px;
}

.search-box input {
    padding: 6px 10px;
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 13px;
    min-width: 220px;
}

.search-box input:focus {
    outline: none;
    border-color: #6366f1;
}

.search-btn {
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: transparent;
    color: #e5e7eb;
    font-size: 12px;
    cursor: pointer;
}

.search-btn:hover {
    background: rgba(148, 163, 184, 0.15);
}

/* Table */
.table-wrapper {
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    background: rgba(15, 23, 42, 0.95);
    overflow: hidden;
}

.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    font-size: 12px;
    border-bottom: 1px solid rgba(30, 41, 59, 0.8);
}

.count {
    color: #9ca3af;
}

.group-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.group-table th,
.group-table td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid rgba(30, 41, 59, 0.8);
}

.group-table th {
    font-weight: 500;
    color: #cbd5f5;
    white-space: nowrap;
}

.group-table tbody tr:hover {
    background: rgba(30, 64, 175, 0.35);
}

.empty {
    text-align: center;
    padding: 18px 0;
    color: #9ca3af;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        'Liberation Mono', 'Courier New', monospace;
}

/* 類型 Pill */
.type-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
}

.type-pill.security {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.type-pill.distribution {
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
}

.type-pill.org {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
}

.type-pill.other {
    background: rgba(148, 163, 184, 0.15);
    color: #e5e7eb;
}

/* Messages */
.error {
    color: #fca5a5;
}

.loading {
    color: #a5b4fc;
}
</style>
