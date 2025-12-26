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
                    <button class="btn-add" @click="openCreate">新 增</button>
                </div>

                <div class="toolbar-item-right">
                    <div class="type-filters">
                        <button v-for="item in typeOptions" :key="item.value" class="type-chip"
                            :class="{ active: typeFilter === item.value }" @click="typeFilter = item.value">
                            {{ item.label }}
                        </button>
                        <input class="search-box" v-model.trim="keyword" type="text" placeholder="搜尋群組名稱 / 描述" />
                    </div>
                </div>
            </div>
        </section>

        <!-- Table -->
        <section class="table-wrapper">
            <table class="group-table">
                <thead>
                    <tr>
                        <th>群組名稱</th>
                        <th>描述</th>
                        <th style="width: 180px">群組類型</th>
                        <th style="width: 120px">成員</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-if="pagedList.length === 0 && !loading">
                        <td colspan="4" class="empty">目前沒有符合條件的群組</td>
                    </tr>

                    <tr v-for="g in pagedList" :key="g.id" class="row" @dblclick="openEdit(g)">
                        <td class="mono link" title="雙擊可修改">{{ g.groupname }}</td>
                        <td>{{ g.description || '-' }}</td>
                        <td>
                            <span class="type-pill" :class="g.grouptype">
                                {{ groupTypeLabel(g.grouptype) }}
                            </span>
                        </td>
                        <td>
                            <button class="link-btn" @click="openMembersDialog(g)">查看</button>
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

        <!-- Error -->
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <!-- 成功提示 -->
        <Transition name="fade">
            <div v-if="successMessage" class="success-toast">
                ✓ {{ successMessage }}
            </div>
        </Transition>
    </div>

    <!-- Modals -->
    <CreateGroupModal :visible="createVisible" :groups="groups" @close="closeCreate" @created="onGroupCreated" />
    <EditGroupModal :visible="editVisible" :group="editingGroup" :groups="groups" @close="closeEdit"
        @updated="onGroupUpdated" @delete="openDeleteConfirm" />
    <ConfirmDeleteGroup :visible="deleteVisible" :group="editingGroup" @cancel="closeDeleteConfirm"
        @confirm="onDelete" />
    <MembersModal :visible="memberDialogVisible" :group="selectedGroup" @close="memberDialogVisible = false" />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, Transition } from 'vue'
import type { Group, GroupType } from '@/services/adadmin'
import { fetchGroups, deleteGroup } from '@/services/adadmin'
import CreateGroupModal from '../../components/CreateGroupModal.vue'
import EditGroupModal from '../../components/EditGroupModal.vue'
import ConfirmDeleteGroup from '../../components/ConfirmDeleteGroup.vue'
import MembersModal from '../../components/MembersModal.vue'

const groups = ref<Group[]>([])
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const keyword = ref('')
// typeFilter：全部 / 安全性群組全域 / 安全性群組網域 / 安全性群組萬用 / 通訊群組 
const typeFilter = ref<'all' | 'security-global' | 'security-domainlocal' | 'security-universal' | 'distribution'>('all')

const typeOptions: { label: string; value: 'all' | 'security-global' | 'security-domainlocal' | 'security-universal' | 'distribution' }[] = [
    { label: '全部', value: 'all' },
    { label: '安全性群組（全域）', value: 'security-global' },
    { label: '安全性群組（網域）', value: 'security-domainlocal' },
    { label: '安全性群組（萬用）', value: 'security-universal' },
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
        groups.value = await fetchGroups({
            q: keyword.value || undefined,
            type: typeFilter.value,
        })
    } catch (e) {
        console.error(e)
        errorMessage.value = '載入群組清單失敗'
    } finally {
        loading.value = false
    }
}

onMounted(loadGroups)

// 搜尋與篩選監聽
let debounceTimer: number | null = null
watch(keyword, () => {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => loadGroups(), 300)
})
// 類型 chip 切換 → 立即搜尋
watch(typeFilter, () => loadGroups())

// =====================
// 分頁功能
// =====================
const PAGE_SIZE = 10
const page = ref(1)

const sourceList = computed(() => groups.value)
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

// =====================
// Members Dialog
// =====================
const memberDialogVisible = ref(false)
const selectedGroup = ref<Group | null>(null)

const openMembersDialog = async (group: Group) => {
    selectedGroup.value = group
    memberDialogVisible.value = true
}

// =====================
// Create Modal
// =====================
const createVisible = ref(false)

const openCreate = () => {
    createVisible.value = true
}
const closeCreate = () => (createVisible.value = false)

const onGroupCreated = async () => {
    await loadGroups()
    successMessage.value = '已成功新增群組'
    setTimeout(() => {
        successMessage.value = ''
    }, 3000)
}

// =====================
// Edit Modal
// =====================
const editVisible = ref(false)
const editingGroup = ref<Group | null>(null)

const openEdit = (g: Group) => {
    editingGroup.value = g
    editVisible.value = true
}
const closeEdit = () => (editVisible.value = false)

const onGroupUpdated = async () => {
    await loadGroups()
    successMessage.value = '已成功更新群組'
    setTimeout(() => {
        successMessage.value = ''
    }, 3000)
}

// =====================
// Delete Confirm
// =====================
const deleteVisible = ref(false)

const openDeleteConfirm = () => {
    deleteVisible.value = true
}
const closeDeleteConfirm = () => (deleteVisible.value = false)

const onDelete = async () => {
    if (!editingGroup.value) return
    try {
        await deleteGroup(editingGroup.value.id)
        deleteVisible.value = false
        editVisible.value = false
        await loadGroups()
    } catch (e: any) {
        console.error(e)
        alert(e?.response?.data?.message || '刪除失敗')
    }
}
</script>

<style scoped>
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

/* .btn-add:hover {
    background: rgba(34, 197, 94, 0.22);
} */

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
tbody {
    overflow-x: auto;
}

.table-wrapper {
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    background: rgba(15, 23, 42, 0.95);
    overflow: hidden;
}

.group-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.92);
}

.group-table th {
    font-weight: 500;
    color: #cbd5f5;
    white-space: nowrap;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    text-align: left;
}

.group-table td {
    font-size: 13px;
    color: #e5e7eb;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    text-align: left;
}

.row:hover {
    background: rgba(30, 64, 175, 0.35);
}

.empty {
    text-align: center;
    padding: 18px 0;
    color: #9ca3af;
}

.error {
    margin-top: 10px;
    color: #fca5a5;
    font-size: 13px;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.link {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
}

.link:hover {
    color: #a5b4fc;
}

/* Type pill */
.type-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
}

.type-pill.security-global {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.type-pill.security-domainlocal {
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
}

.type-pill.security-universal {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
}

.type-pill.distribution {
    background: rgba(147, 51, 234, 0.15);
    color: #c4b5fd;
}

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
    background: radial-gradient(circle at top left, #4f46e5, #7c3aed);
}

/* Success Toast */
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

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
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
