<!-- src/views/users/UserListView.vue -->
<template>
    <div class="user-list-page">
        <!-- Toolbar -->
        <section class="toolbar">
            <div class="title-block">
                <h2>使用者管理</h2>
                <p class="subtitle">目前以假資料開發，後續會改為串接 ADadmin-api</p>
            </div>

            <div class="toolbar-actions">
                <div class="toolbar-item-left">
                    <button class="btn-add" @click="openCreate">新 增</button>
                </div>
                <div class="toolbar-item-right">
                    <div class="status-filters search-box">
                        <button v-for="item in statusOptions" :key="item.value" class="status-chip"
                            :class="{ active: statusFilter === item.value }" @click="statusFilter = item.value">
                            {{ item.label }}
                        </button>
                        <input v-model.trim="keyword" type="text" placeholder="搜尋帳號 / 顯示名稱 / Email / 部門" />
                    </div>
                </div>
            </div>
        </section>

        <!-- 資料表區 -->
        <section class="table-wrapper">
            <table class="user-table">
                <thead>
                    <tr>
                        <th>帳號</th>
                        <th>顯示名稱</th>
                        <th>Email</th>
                        <th>部門</th>
                        <th>OU</th>
                        <th>群組</th>
                        <th>狀態</th>
                        <th>最後登入時間</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="filteredUsers.length === 0">
                        <td colspan="7" class="empty">
                            查無符合條件的使用者
                        </td>
                    </tr>

                    <tr v-for="user in filteredUsers" :key="user.username">
                        <!-- 帳號 -->
                        <!-- <td class="mono link" @dblclick="openUserDetail(user)" title="雙擊查看詳細資訊"> -->
                        <td class="mono link" @dblclick="openEdit(user)" title="雙擊查看詳細資訊">
                            {{ user.username }}
                        </td>
                        <!-- 顯示名稱 -->
                        <td>{{ user.display_name }}</td>
                        <!-- Email -->
                        <td class="mono">{{ user.email || '-' }}</td>
                        <!-- 部門 -->
                        <td>{{ user.department || '-' }}</td>
                        <!-- OU -->
                        <td class="mono ou-cell">
                            <div v-if="user.ou" class="ou-dn">{{ user.ou || '未指定' }}</div>
                        </td>
                        <!-- 群組 -->
                        <div v-if="parseGroups(user.groupsname).length > 0" class="mono groups-wrap">
                            <span v-for="g in parseGroups(user.groupsname)" :key="g" class="group-chip">
                                {{ g }}
                            </span>
                        </div>
                        <span v-else class="muted">未設定</span>
                        <!-- 狀態 -->
                        <td>
                            <span class="status-pill" :class="user.status">
                                {{ statusLabel(user.status) }}
                            </span>
                        </td>
                        <!-- 最後登入時間 -->
                        <td class="mono">
                            {{ user.last_login_at || '-' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
        <!-- 詳細資訊彈窗 -->
        <!-- <div v-if="selectedUser" class="modal-backdrop" @click.self="closeDetail">
            <div class="modal">
                <header class="modal-header">
                    <h3>使用者詳細資訊</h3>
                    <button class="close-btn" @click="closeDetail">✕</button>
                </header>

                <section class="modal-body">
                    <p><strong>帳號：</strong><span class="mono">{{ selectedUser.username }}</span></p>
                    <p><strong>顯示名稱：</strong>{{ selectedUser.display_name }}</p>
                    <p><strong>Email：</strong><span class="mono">{{ selectedUser.email }}</span></p>
                    <p><strong>部門：</strong>{{ selectedUser.department || '-' }}</p>
                    <p><strong>OU：</strong><span class="mono">{{ selectedUser.ou || '-' }}</span></p>
                    <p>
                        <strong>狀態：</strong>
                        <span class="status-pill" :class="selectedUser.status">
                            {{ statusLabel(selectedUser.status) }}
                        </span>
                    </p>
                    <p>
                        <strong>最後登入時間：</strong>
                        <span class="mono">{{ selectedUser.last_login_at || '-' }}</span>
                    </p>

                    <p v-if="detailError" class="error">
                        {{ detailError }}
                    </p>
                    <p v-if="detailLoading" class="loading">
                        讀取中...
                    </p>
                </section>

                <footer class="modal-footer">
                    <button class="action-btn" :disabled="detailLoading" @click="changeStatus(selectedUser, 'locked')">
                        鎖定帳號
                    </button>

                    <button class="action-btn" :disabled="detailLoading" @click="changeStatus(selectedUser, 'active')">
                        解鎖（設為啟用）
                    </button>

                    <button class="action-btn danger" :disabled="detailLoading"
                        @click="changeStatus(selectedUser, 'disabled')">
                        停用帳號
                    </button>
                </footer>
            </div>
        </div> -->
        <CreateUserModal v-if="showCreate" :ous="ous" :groups="groups" @close="showCreate = false"
            @submit="submitCreate" />

        <EditUserModal v-if="showEdit && editingUser" :user="editingUser" :ous="ous" :groups="groups" @close="closeEdit"
            @submit="submitEdit" @delete="requestDelete" @unlock="doUnlock" />

        <ConfirmDeleteUser v-if="showDeleteConfirm" @cancel="showDeleteConfirm = false" @confirm="confirmDelete" />

    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
    User, UserStatus, fetchUser,
    fetchUsers, createUser, updateUser, deleteUser, unlockUser,
    fetchOus, fetchGroups,
    type UserItem, type OuItem, type GroupItem
} from '@/services/adadmin'

import CreateUserModal from '../../components/CreateUserModal.vue'
import EditUserModal from '../../components/EditUserModal.vue'
import ConfirmDeleteUser from '../../components/ConfirmDeleteUser.vue'

const keyword = ref('')
const statusFilter = ref<'all' | UserStatus>('all')
// 使用者清單
// const users = ref<User[]>([])
// 詳細資訊彈窗相關
const selectedUser = ref<User | null>(null)
const detailLoading = ref(false)
const detailError = ref('')

// 
const users = ref<UserItem[]>([])
const ous = ref<OuItem[]>([])
const groups = ref<GroupItem[]>([])

const showCreate = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)

const editingUser = ref<UserItem | null>(null)

const loadAll = async () => {
    users.value = await fetchUsers()
    ous.value = await fetchOus()
    groups.value = await fetchGroups()
}

onMounted(loadAll)

// 新增/修改/刪除/解鎖 handlers
const openCreate = () => { showCreate.value = true }

const submitCreate = async (payload: any) => {
    await createUser(payload)
    showCreate.value = false
    await loadAll()
}

const openEdit = (u: UserItem) => {
    editingUser.value = u
    showEdit.value = true
}

const closeEdit = () => {
    editingUser.value = null
    showEdit.value = false
}

const submitEdit = async (payload: any) => {
    if (!editingUser.value) return
    await updateUser(editingUser.value.id, payload)
    await loadAll()          // ✅ 立即更新
    closeEdit()
}

const requestDelete = () => { showDeleteConfirm.value = true }

const confirmDelete = async () => {
    if (!editingUser.value) return
    await deleteUser(editingUser.value.id)
    showDeleteConfirm.value = false
    closeEdit()
    await loadAll()
}

const doUnlock = async () => {
    if (!editingUser.value) return
    await unlockUser(editingUser.value.id)
    await loadAll()
    // modal 不關也行，但建議留著讓他看到狀態變 active
}

// 加上開啟使用者詳細資訊的函式
const openUserDetail = async (user: User) => {
    selectedUser.value = { ...user } // 先用列表資料填上
    detailError.value = ''
    detailLoading.value = true

    try {
        // 再呼叫 API 拿最新資料（順便用到 /api/users/:username）
        const latest = await fetchUser(user.username)
        selectedUser.value = latest

        // 同步更新列表中的那一筆
        const idx = users.value.findIndex((u) => u.username === latest.username)
        if (idx !== -1) {
            users.value[idx] = latest
        }
    } catch (err) {
        console.error('openUserDetail error >>>', err)
        detailError.value = '載入使用者詳細資訊失敗'
    } finally {
        detailLoading.value = false
    }
}

// 將 DB 存的 groupsname（例如 "IT_Admins,Hospital_Staff_All"）拆成陣列
const parseGroups = (groupsname?: string | null): string[] => {
    if (!groupsname) return []
    return groupsname
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g.length > 0)
}


// 關閉詳細資訊彈窗
const closeDetail = () => {
    selectedUser.value = null
    detailError.value = ''
}

// 變更使用者狀態：鎖定 / 解鎖 / 停用
const changeStatus = async (user: User, newStatus: UserStatus) => {
    detailError.value = ''
    detailLoading.value = true

    try {
        const updated = await updateUserStatus(user.username, newStatus)

        // 更新列表中的那一筆
        const idx = users.value.findIndex((u) => u.username === updated.username)
        if (idx !== -1) {
            users.value[idx] = updated
        }

        // 更新彈窗中的資料
        if (selectedUser.value && selectedUser.value.username === updated.username) {
            selectedUser.value = updated
        }
    } catch (err) {
        console.error('changeStatus error >>>', err)
        detailError.value = '更新使用者狀態失敗'
    } finally {
        detailLoading.value = false
    }
}

const loading = ref(false)
const errorMessage = ref('')

const statusOptions = [
    { label: '全部', value: 'all' as const },
    { label: '啟用中', value: 'active' as const },
    { label: '已鎖定', value: 'locked' as const },
    { label: '已停用', value: 'disabled' as const },
]

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

const loadUsers = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
        users.value = await fetchUsers()
    } catch (err) {
        console.error(err)
        errorMessage.value = '載入使用者清單失敗'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadUsers()
})

const filteredUsers = computed(() => {
    const kw = keyword.value.toLowerCase()

    return users.value.filter((user) => {
        if (statusFilter.value !== 'all' && user.status !== statusFilter.value) {
            return false
        }

        if (!kw) return true

        const target =
            `${user.username} ${user.display_name} ${user.email} ${user.department ?? ''}`.toLowerCase()

        return target.includes(kw)
    })
})
</script>

<style scoped>
/* .user-list-page {
    display: flex;
    flex-direction: column;
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

.status-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.status-chip {
    padding: 8px 12px;
    font-size: 12px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: transparent;
    color: #e5e7eb;
    cursor: pointer;
}

.status-chip.active {
    border-color: #6366f1;
    background: radial-gradient(circle at top left, #4f46e5, #7c3aed);
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

.user-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid rgba(148, 163, 184, .35);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(15, 23, 42, .92)
}

.user-table th {
    font-weight: 500;
    color: #cbd5f5;
    white-space: nowrap;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, .18);
    text-align: left;
}

.user-table td {
    font-size: 13px;
    color: #e5e7eb;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, .18);
    text-align: left;
}

.user-table tbody tr:hover {
    background: rgba(30, 64, 175, 0.35);
}

.empty {
    text-align: center;
    padding: 18px 0;
    color: #9ca3af;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
        "Liberation Mono", "Courier New", monospace;
}

.ou-cell {
    max-width: 400px;
    overflow-x: auto;
}

.ou-dn {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

.link {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
}

.link:hover {
    color: #a5b4fc;
}

/* Modal */
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal {
    width: 420px;
    max-width: 95vw;
    background: #020617;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.9);
    padding: 14px 16px 12px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(148, 163, 184, 0.3);
    padding-bottom: 8px;
}

.modal-header h3 {
    margin: 0;
    font-size: 15px;
}

.close-btn {
    border: none;
    background: transparent;
    color: #9ca3af;
    cursor: pointer;
    font-size: 16px;
}

.close-btn:hover {
    color: #e5e7eb;
}

.modal-body {
    margin-top: 8px;
    font-size: 13px;
}

.modal-body p {
    margin: 4px 0;
}

.modal-footer {
    margin-top: 10px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.action-btn {
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.8);
    background: transparent;
    color: #e5e7eb;
    cursor: pointer;
}

.action-btn:hover {
    background: rgba(148, 163, 184, 0.15);
}

.action-btn.danger {
    border-color: #f97373;
    color: #fecaca;
}

.action-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.error {
    margin-top: 6px;
    font-size: 12px;
    color: #fca5a5;
}

.loading {
    margin-top: 6px;
    font-size: 12px;
    color: #a5b4fc;
}

.groups-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.group-chip {
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    font-size: 11px;
    white-space: nowrap;
}

.muted {
    font-size: 12px;
    color: #9ca3af;
}
</style>
