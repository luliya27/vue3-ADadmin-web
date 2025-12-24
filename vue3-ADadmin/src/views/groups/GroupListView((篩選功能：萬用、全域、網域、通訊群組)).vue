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
                <div class="toolbar-item-left">
                    <button class="btn-add" @click="openCreate">新增</button>
                </div>
                <div class="toolbar-item-right">
                    <!-- chip 分類篩選功能 -->
                    <div class="type-filters search-box">
                        <button v-for="item in typeOptions" :key="item.value" class="type-chip"
                            :class="{ active: typeFilter === item.value }" @click="typeFilter = item.value">
                            {{ item.label }}
                        </button>
                        <input v-model.trim="keyword" type="text" placeholder="搜尋群組名稱 / 描述" />
                    </div>
                </div>
            </div>
        </section>

        <!-- 資料表區 -->
        <section class="table-wrapper">
            <table class="group-table">
                <thead>
                    <tr>
                        <th style="width: 35%">群組名稱</th>
                        <th style="width: 35%">描述</th>
                        <th style="width: 15%">群組類型</th>
                        <th style="width: 15%; text-align:center;">成員</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading">
                        <td colspan="4" class="empty">載入中...</td>
                    </tr>
                    <tr v-else-if="errorMessage">
                        <td colspan="4" class="empty error">{{ errorMessage }}</td>
                    </tr>
                    <tr v-else-if="groups.length === 0">
                        <td colspan="4" class="empty">目前沒有資料</td>
                    </tr>

                    <tr v-else v-for="g in groups" :key="g.id ?? g.groupname" class="row" @dblclick="openEdit(g)"
                        title="雙擊可修改 / 刪除">
                        <td class="clickable">{{ g.groupname }}</td>
                        <td class="muted">{{ g.description || '-' }}</td>
                        <td>
                            <span class="type-badge" :class="badgeClass(g.grouptype)">
                                {{ typeLabel(g.grouptype) }}
                            </span>
                        </td>
                        <td style="text-align:center;">
                            <button class="btn-purple-sm" @click.stop="openMembers(g)">查看</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
        <!-- 建立 -->
        <CreateGroupModal v-if="showCreate" :type-options="grouptypeOptions" @close="showCreate = false"
            @submit="handleCreate" />
        <!-- 修改 / 刪除 -->
        <EditGroupModal v-if="showEdit && editingGroup" :group="editingGroup" :type-options="grouptypeOptions"
            @close="closeEdit" @submit="handleUpdate" @request-delete="openDeleteConfirm" />
        <!-- 刪除防呆 -->
        <ConfirmDeleteModal v-if="showDelete" title="確定將群組刪除？" @cancel="showDelete = false" @confirm="handleDelete" />
    </div>
    <!-- 群組成員彈窗 -->
    <div v-if="memberDialogVisible" class="modal-backdrop" @click.self="memberDialogVisible = false">
        <div class="modal">
            <header class="modal-header">
                <div>
                    <h3>
                        群組成員 -
                        <span class="mono">{{ selectedGroup?.groupname }}</span>
                    </h3>
                    <p class="subtitle">
                        {{ selectedGroup?.description || '—' }}
                    </p>
                </div>
                <button class="close-btn" @click="memberDialogVisible = false">
                    ✕
                </button>
            </header>

            <section class="modal-body">
                <div v-if="loadingMembers" class="center-text">載入中...</div>
                <div v-else-if="membersError" class="error">{{ membersError }}</div>
                <div v-else-if="groupMembers.length === 0" class="center-text">
                    目前沒有成員
                </div>
                <table v-else class="member-table">
                    <thead>
                        <tr>
                            <th>帳號</th>
                            <th>名稱</th>
                            <th>Email</th>
                            <th>部門</th>
                            <th>OU</th>
                            <th>狀態</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in groupMembers" :key="u.username">
                            <td class="mono">{{ u.username }}</td>
                            <td>{{ u.display_name }}</td>
                            <td class="mono">{{ u.email }}</td>
                            <!-- <td>{{ u.department || '-' }}</td> -->
                            <td class="mono">
                                <div>{{ u.ouname || '未指定' }}</div>
                            </td>
                            <td>

                                <div v-if="u.ou_dn || u.ou" class="ou-dn">
                                    {{ u.ou_dn || u.ou }}
                                </div>
                            </td>
                            <!-- <td>{{ u.status }}</td> -->
                            <td>
                                <span class="status-pill" :class="u.status">
                                    {{ statusLabel(u.status) }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <footer class="modal-footer">
                <button class="primary-btn" @click="memberDialogVisible = false">
                    關閉
                </button>
            </footer>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Group, GroupType } from '@/services/adadmin'
import { fetchGroups, fetchGroupMembers } from '@/services/adadmin'
import type { User, UserStatus } from '@/services/adadmin'


// 👉 新增：群組成員彈窗相關 state
const memberDialogVisible = ref(false) // 是否顯示成員彈窗
const selectedGroup = ref<Group | null>(null) // 當前選中的群組
const groupMembers = ref<User[]>([]) // 當前群組的成員列表
const loadingMembers = ref(false)  // 是否正在載入成員
const membersError = ref('') // 載入成員錯誤訊息

// 👉 開啟群組成員彈窗函式
const openMembersDialog = async (group: Group) => {
    selectedGroup.value = group
    memberDialogVisible.value = true
    loadingMembers.value = true
    membersError.value = ''
    groupMembers.value = []

    try {
        groupMembers.value = await fetchGroupMembers(group.groupname)
    } catch (err) {
        console.error(err)
        membersError.value = '載入群組成員失敗'
    } finally {
        loadingMembers.value = false
    }
}

// 👉 使用者狀態標籤函式
const statusLabel = (status: UserStatus) => {
    switch (status) {
        case 'active':
            return '啟用中'
        case 'locked':
            return '已鎖定'
        case 'disabled':
            return '已停用'
        default:
            return status
    }
}

// 👉 新增群組函式（預留）
const openCreate = () => {
    console.log('新增群組功能開發中...')
}

// 👉 編輯群組函式（預留）
const openEdit = (group: Group) => {
    console.log('編輯群組:', group.groupname)
}

const groups = ref<Group[]>([])
const loading = ref(false)
const errorMessage = ref('')

const keyword = ref('')
// typeFilter：全部 / 安全性群組 / 通訊群組
const typeFilter = ref<'all' | 'security-global' | 'security-domainlocal' | 'security-universal' | 'distribution'>('all')


const typeOptions: { label: string; value: 'all' | 'security-global' | 'security-domainlocal' | 'security-universal' | 'distribution' }[] = [
    { label: '全部類型', value: 'all' },
    { label: '全域群組', value: 'security-global' },
    { label: '網域群組', value: 'security-domainlocal' },
    { label: '萬用群組', value: 'security-universal' },
    { label: '通訊群組', value: 'distribution' },
]

// human readable label（細種類型）
const groupTypeLabel = (t: GroupType): string => {
    switch (t) {
        case 'security-global':
            return '安全性群組 / 全域'
        case 'security-domainlocal':
            return '安全性群組 / 網域'
        case 'security-universal':
            return '安全性群組 / 萬用'
        case 'distribution':
            return '通訊群組'
        default:
            return t
    }
}

// 載入群組清單函式
const loadGroups = async () => {
    loading.value = true
    errorMessage.value = ''

    try {
        // 注意這裡要傳正確的 typeFilter
        groups.value = await fetchGroups({
            q: keyword.value || undefined,
            type: typeFilter.value,   // <── 保證帶正確分類
        })
    } catch (err) {
        console.error(err)
        errorMessage.value = '載入群組清單失敗'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadGroups()
})

// 搜尋 keyword → debounce 自動搜尋（如果你有用）
let debounceTimer: number | null = null

watch(keyword, () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
        loadGroups()
    }, 300)
})

// 類型 chip 切換 → 立即搜尋
watch(typeFilter, () => {
    loadGroups()
})
</script>

<style scoped>
/* .group-list-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
} */

/* Toolbar */
/* .toolbar {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
} */

.title-block h2 {
    margin: 0 0 4px;
    font-size: 18px;
}

.subtitle {
    margin: 0;
    font-size: 14px;
    color: #9ca3af;
}

.btn-add {
    padding: 6px 16px;
    word-spacing: 1px;
    font-size: 13px;
    border-radius: 999px;
    border: none;
    background: radial-gradient(circle at top left, #009E39, #376A4A);
    color: #ffffff;
    cursor: pointer;
}

.toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    margin: 10px 0px;
}

.type-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.type-chip {
    padding: 8px 12px;
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
    padding: 8px 12px;
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

/* Table */
.table-wrapper {
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    background: rgba(15, 23, 42, 0.95);
    overflow: hidden;
}

.group-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid rgba(148, 163, 184, .35);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(15, 23, 42, .92)
}

.group-table th {
    font-weight: 500;
    color: #cbd5f5;
    white-space: nowrap;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, .18);
    text-align: left;
}

.group-table td {
    font-size: 13px;
    color: #e5e7eb;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, .18);
    text-align: left;
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

.link {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
}

.link:hover {
    color: #a5b4fc;
}

/* 類型 Pill */
.type-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
}

/* 安全性群組 - 全域 */
.type-pill.security-global {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

/* 安全性群組 - 網域 */
.type-pill.security-domainlocal {
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
}

/* 安全性群組 - 萬用 */
.type-pill.security-universal {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
}

/* 通訊群組 */
.type-pill.distribution {
    background: rgba(147, 51, 234, 0.15);
    color: #c4b5fd;
}

/* ------彈窗樣式------ */
.link-btn {
    padding: 4px 12px;
    font-size: 13px;
    border-radius: 999px;
    border: 1px solid #6366f1;
    background: #4f46e5;
    color: #e5e7eb;
    cursor: pointer;
}

.link-btn:hover {
    /* text-decoration: underline; */
    background: radial-gradient(circle at top left, #4f46e5, #7c3aed);
}

/* Modal */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 40;
}

.modal {
    background: #020617;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.6);
    width: 900px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.modal-header {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(30, 41, 59, 0.9);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 15px;
}

.modal-header .subtitle {
    margin: 2px 0 0;
    font-size: 12px;
    color: #9ca3af;
}

.close-btn {
    border: none;
    background: transparent;
    color: #9ca3af;
    font-size: 16px;
    cursor: pointer;
}

.modal-body {
    padding: 8px 12px 12px;
    overflow: auto;
}

.modal-footer {
    padding: 8px 12px;
    border-top: 1px solid rgba(30, 41, 59, 0.9);
    display: flex;
    justify-content: flex-end;
}

.primary-btn {
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid #6366f1;
    background: #4f46e5;
    color: #e5e7eb;
    font-size: 13px;
    cursor: pointer;
}

.center-text {
    padding: 16px;
    text-align: center;
    font-size: 13px;
    color: #9ca3af;
}

.member-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.member-table th,
.member-table td {
    padding: 4px 6px;
    border-bottom: 1px solid rgba(30, 41, 59, 0.8);
}

.member-table th {
    text-align: left;
    font-weight: 500;
    color: #9ca3af;
}

.ou-dn {
    font-size: 11px;
    opacity: 0.7;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        'Liberation Mono', 'Courier New', monospace;
}

/* 狀態 Pill */
.status-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
}

.status-pill.active {
    width: 36px;
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.status-pill.locked {
    width: 36px;
    background: rgba(249, 115, 22, 0.15);
    color: #fdba74;
}

.status-pill.disabled {
    width: 36px;
    background: rgba(148, 163, 184, 0.15);
    color: #9ca3af;
}
</style>