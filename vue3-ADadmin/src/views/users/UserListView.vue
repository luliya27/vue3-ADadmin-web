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
                    <!-- <button class="btn-add" @click="openCreate">新 增</button> -->
                    <button class="btn-add" @click="showCreate = true">新 增</button>
                </div>
                <div class="toolbar-item-right">
                    <div class="status-filters">
                        <button v-for="item in statusOptions" :key="item.value" class="status-chip"
                            :class="{ active: statusFilter === item.value }" @click="statusFilter = item.value">
                            {{ item.label }}
                        </button>
                        <input class="search-box" v-model.trim="keyword" type="text"
                            placeholder="搜尋帳號 / 顯示名稱 / Email / 部門" />
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
                    <tr v-if="pagedList.length === 0">
                        <td colspan="8" class="empty">
                            查無符合條件的使用者
                        </td>
                    </tr>

                    <tr v-for="user in pagedList" :key="user.username">
                        <!-- 帳號 -->
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
                            <!-- <div v-if="user.ou" class="ou-dn">{{ user.ou || '未指定' }}</div> -->
                            <div v-if="user.ouname" class="ou-name">{{ user.ouname }}</div>
                            <div v-else class="muted">未指定</div>
                        </td>
                        <!-- 群組 -->
                        <td v-if="parseGroups(user.groupsname).length > 0" class="mono groups-wrap">
                            <span v-for="g in parseGroups(user.groupsname)" :key="g" class="group-chip">
                                {{ g }}
                            </span>
                        </td>
                        <!-- 狀態 -->
                        <td v-else><span class="muted">未指定</span></td>
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
            <!-- 分頁 -->
            <div v-if="showPagination" class="pagination">
                <div class="info">
                    共 {{ total }} 筆　｜　第 {{ page }} / {{ totalPages }} 頁
                </div>

                <div class="controls">
                    <button class="pbtn" :disabled="page === 1" @click="goPrev">上一頁</button>

                    <button v-for="p in pageNumbers" :key="String(p)" class="pbtn" :class="{ active: p === page }"
                        :disabled="p === '...'" @click="p !== '...' && goPage(p as number)">
                        {{ p }}
                    </button>

                    <button class="pbtn" :disabled="page === totalPages" @click="goNext">下一頁</button>
                </div>
            </div>
        </section>

        <!-- 成功提示 -->
        <Transition name="fade">
            <div v-if="successMessage" class="success-toast">
                ✓ {{ successMessage }}
            </div>
        </Transition>
        <!-- Modals -->
        <CreateUserModal v-if="showCreate" :ous="ous" :groups="groups" :users="users" @close="showCreate = false"
            @submit="submitCreate" />
        <EditUserModal v-if="showEdit && editingUser" :user="editingUser" :ous="ous" :groups="groups" :users="users"
            @close="closeEdit" @submit="submitEdit" @delete="requestDelete" @unlock="doUnlock" />
        <ConfirmDeleteUser :visible="showDeleteConfirm" :user="editingUser" @cancel="showDeleteConfirm = false"
            @confirm="confirmDelete" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
    type UserStatus,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    unlockUser,
    fetchOus,
    fetchGroups,
    type User,
    type OuItem,
    type GroupItem
} from '@/services/adadmin'

import CreateUserModal from '../../components/CreateUserModal.vue'
import EditUserModal from '../../components/EditUserModal.vue'
import ConfirmDeleteUser from '../../components/ConfirmDeleteUser.vue'

// 搜尋關鍵字
const keyword = ref('')
// 狀態篩選
// const statusFilter = ref<'all' | 'active' | 'locked' | 'disabled'>('all')
const statusFilter = ref<'all' | UserStatus>('all')

const users = ref<User[]>([])
const ous = ref<OuItem[]>([])
const groups = ref<GroupItem[]>([])

const showCreate = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)
const editingUser = ref<User | null>(null)

// 統一載入資料
const loadAll = async () => {
    users.value = await fetchUsers()
    const ouList = await fetchOus()
    // 轉換 OU 數據，確保 id 為 number 類型且 description 為 string
    ous.value = ouList
        .filter((o): o is typeof o & { id: number } => o.id !== undefined && o.id !== null)
        .map(o => ({
            ...o,
            id: typeof o.id === 'string' ? parseInt(o.id, 10) : o.id,
            description: o.description || ''
        }))
    const groupList = await fetchGroups()
    // 轉換 Group 數據，確保 description 為 string 類型
    groups.value = groupList.map(g => ({
        ...g,
        description: g.description || ''
    }))
}

onMounted(loadAll)

// =====================
// 篩選後的使用者清單
// =====================
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

// =====================
// 分頁功能
// =====================
const PAGE_SIZE = 10
const page = ref(1)

const sourceList = computed(() => filteredUsers.value)
const total = computed(() => sourceList.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const showPagination = computed(() => total.value > 0)

// 目前頁面的資料
const pagedList = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return sourceList.value.slice(start, start + PAGE_SIZE)
})

// UI 用：顯示頁碼（最多 7 顆，含 ...）
const pageNumbers = computed(() => {
    const pages: (number | '...')[] = []
    const maxButtons = 7
    const tp = totalPages.value
    const cur = page.value

    if (tp <= maxButtons) {
        for (let i = 1; i <= tp; i++) pages.push(i)
        return pages
    }

    const left = Math.max(1, cur - 1)
    const right = Math.min(tp, cur + 1)

    pages.push(1)
    if (left > 2) pages.push('...')

    for (let i = left; i <= right; i++) {
        if (i !== 1 && i !== tp) pages.push(i)
    }

    if (right < tp - 1) pages.push('...')
    pages.push(tp)

    return pages
})

const goPrev = () => { if (page.value > 1) page.value-- }
const goNext = () => { if (page.value < totalPages.value) page.value++ }
const goPage = (p: number) => { page.value = p }

// ✅ 當搜尋/篩選結果改變時，自動回到第一頁
watch([() => sourceList.value.length], () => {
    page.value = 1
})

// ✅ 防呆：當資料變少導致頁碼超過，拉回最後一頁
watch([totalPages], () => {
    if (page.value > totalPages.value) page.value = totalPages.value
})

// 新增/修改/刪除/解鎖 handlers
// const openCreate = () => { showCreate.value = true }
// 提交新增使用者
const submitCreate = async (payload: any) => {
    try {
        await createUser(payload)
        showCreate.value = false // 關閉 modal
        showSuccessMessage('已成功新增使用者')
        // 重新載入清單
        await loadAll()
    } catch (error) {
        console.error('新增使用者失敗：', error)
        errorMessage.value = '新增失敗，請檢查輸入並重試'
    }
}

// 開啟編輯使用者 modal
const openEdit = (user: User) => {
    editingUser.value = user
    showEdit.value = true
}

// 關閉編輯使用者 modal
const closeEdit = () => {
    editingUser.value = null
    showEdit.value = false
}

// 提交儲存 修改使用者
const submitEdit = async (payload: any) => {
    if (!editingUser.value) return
    try {
        await updateUser(editingUser.value.id, payload)
        showSuccessMessage('已成功更新使用者資訊')
        await loadAll()          // ✅ 立即更新
        closeEdit()
    } catch (error) {
        console.error('更新使用者失敗：', error)
        errorMessage.value = '更新失敗，請重試'
    }
}
// 請求刪除使用者
const requestDelete = () => { showDeleteConfirm.value = true }

const confirmDelete = async () => {
    if (!editingUser.value) return
    try {
        await deleteUser(editingUser.value.id)
        const username = editingUser.value.display_name || editingUser.value.username
        showSuccessMessage(`已成功刪除使用者：${username}`)
        showDeleteConfirm.value = false
        closeEdit()
        await loadAll()
    } catch (error) {
        console.error('刪除使用者失敗：', error)
        errorMessage.value = '刪除失敗，請重試'
        showDeleteConfirm.value = false
    }
}

// 解鎖使用者 
// 解鎖(status===locked)
const doUnlock = async () => {
    if (!editingUser.value) return
    try {
        await unlockUser(editingUser.value.id)
        const username = editingUser.value.display_name || editingUser.value.username
        showSuccessMessage(`已成功解鎖使用者：${username}`)
        await loadAll()
        closeEdit() // 👈 解鎖成功後關閉 modal
    } catch (error) {
        console.error('解鎖使用者失敗：', error)
        errorMessage.value = '解鎖失敗，請重試'
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

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// 顯示成功訊息，2秒後自動消失
const showSuccessMessage = (message: string) => {
    successMessage.value = message
    setTimeout(() => {
        successMessage.value = ''
    }, 2000)
}

const statusOptions = [
    { label: '全部', value: 'all' as const },
    { label: '啟用中', value: 'active' as const },
    { label: '已鎖定', value: 'locked' as const },
    { label: '已停用', value: 'disabled' as const },
]

// 狀態標籤文字
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
    flex-wrap: wrap;
    gap: 6px;
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

.toolbar-item-right input {
    padding: 8px 12px;
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 13px;
    min-width: 220px;
}

.toolbar-item-right input:focus {
    outline: none;
    border-color: #6366f1;
}

/* Table */
tbody{
    overflow-x: auto;
}

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

.link {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
}

.link:hover {
    color: #a5b4fc;
}

.ou-cell {
    max-width: 400px;
    overflow-x: auto;
}

.ou-name {
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
    /* padding: 5px 0px; */
    margin: 2px 0px 0px 0px;
}

.group-chip {
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    font-size: 11px;
    white-space: nowrap;
}

.muted {
    font-size: 12px !important;
    color: #9ca3af !important;
}

/* 成功提示 */
.success-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(34, 197, 94, 0.95);
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    z-index: 100;
    border: 1px solid rgba(34, 197, 94, 0.5);
}

/* Transition 動畫 */
.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
}

/* Pagination */
.pagination {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(15, 23, 42, 0.65);
}

.pagination .info {
    font-size: 12px;
    color: rgba(226, 232, 240, 0.85);
}

.pagination .controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.pbtn {
    height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(2, 6, 23, 0.45);
    color: #e5e7eb;
    cursor: pointer;
    font-size: 13px;
}

.pbtn.active {
    border: none;
    background: #a855f7;
    color: #f9fafb;
}

.pbtn:disabled {
    opacity: .55;
    cursor: default;
}
</style>
