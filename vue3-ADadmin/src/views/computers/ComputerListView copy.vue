<template>
    <div class="computer-list-page">
        <section>
            <div class="title-block">
                <h2>電腦管理</h2>
                <p class="subtitle">顯示 AD 電腦清單，目前以 SQLite 假資料模擬，後續可改為實際 AD 同步。</p>
            </div>

            <div class="toolbar-actions">
                <div class="toolbar-item-left">
                    <button class="btn-add" @click="openCreate">新 增</button>
                </div>

                <div class="toolbar-item-right">
                    <div class="filters">
                        <select v-model="domainFilter" class="select">
                            <option value="">網域加入狀態</option>
                            <option value="Joined">已加入網域</option>
                            <option value="LeftDomain">已離開網域</option>
                            <option value="NotJoined">未加入網域</option>
                        </select>

                        <select v-model="connFilter" class="select">
                            <option value="">連線狀態</option>
                            <option value="Online">線上</option>
                            <option value="Offline">離線</option>
                            <option value="LockedOut">鎖定</option>
                        </select>

                        <select v-model="accFilter" class="select">
                            <option value="">電腦帳戶狀態</option>
                            <option value="Enabled">啟用中</option>
                            <option value="Disabled">停用中</option>
                            <option value="Unused">已建立但未啟用</option>
                        </select>

                        <input v-model.trim="keyword" class="search" placeholder="搜尋電腦名稱" />
                    </div>
                </div>
            </div>
        </section>

        <section class="table-wrapper">
            <table class="table">
                <thead>
                    <tr>
                        <th>電腦名稱</th>
                        <th>OS</th>
                        <th>所屬OU</th>
                        <th>網域加入狀態</th>
                        <th>連線狀態</th>
                        <th>電腦帳戶狀態</th>
                    </tr>
                </thead>

                <tbody>
                    <!-- <tr v-for="c in computers" :key="c.id" @dblclick="openEdit(c)"> -->
                    <tr v-for="c in pagedList" :key="c.id" @dblclick="openEdit(c)">
                        <td class="link">{{ c.cpname }}</td>
                        <td>{{ c.os }}</td>
                        <td>{{ c.ouname || '未指定' }}</td>

                        <td><span class="chip" :class="'domain-' + c.DomainMembershipStatus">{{
                            domainText(c.DomainMembershipStatus) }}</span></td>
                        <td><span class="chip" :class="'conn-' + c.ConnectivityStatus">{{ connText(c.ConnectivityStatus)
                                }}</span></td>
                        <td><span class="chip" :class="'acc-' + c.ComputerAccount_inADStatus">{{
                            accText(c.ComputerAccount_inADStatus) }}</span></td>
                    </tr>

                    <!-- <tr v-if="!computers.length"> -->
                    <tr v-if="!pagedList.length">
                        <td colspan="6" class="empty">目前沒有資料</td>
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
         
        <!-- 新增 / 修改 / 刪除防呆 -->
        <CreateComputerModal v-if="showCreate" :ou-options="ouOptions" :computers="computers" @close="showCreate = false"
            @submit="submitCreate" />
        <EditComputerModal v-if="showEdit && editing" :computer="editing" :ou-options="ouOptions" :computers="computers" @close="closeEdit"
            @submit="submitEdit" @delete="openDeleteConfirm" />
        <ConfirmDelete v-if="showDelete" @cancel="showDelete = false" @confirm="confirmDelete" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { fetchComputers, createComputer, updateComputer, deleteComputer } from '@/services/adadmin'
import { fetchOus } from '@/services/adadmin'

import CreateComputerModal from '../../components/CreateComputerModal.vue'
import EditComputerModal from '../../components/EditComputerModal.vue'
import ConfirmDelete from '../../components/ConfirmDeleteComputer.vue'

type OuItem = { id: number; ouname: string }
type ComputerItem = any

const computers = ref<ComputerItem[]>([])
const ouOptions = ref<OuItem[]>([])

const keyword = ref('')
const domainFilter = ref('')
const connFilter = ref('')
const accFilter = ref('')

const showCreate = ref(false)
const showEdit = ref(false)
const showDelete = ref(false)
const editing = ref<ComputerItem | null>(null)

const load = async () => {
    computers.value = await fetchComputers({
        q: keyword.value,
        domain: domainFilter.value,
        conn: connFilter.value,
        acc: accFilter.value,
    })
}

// 分頁效果
const PAGE_SIZE = 12
const page = ref(1)

// 你的列表來源：假設你目前是 computers.value (API 回來的全部)
// 如果你已經有 computed filteredComputers，就把下面的 source 改成 filteredComputers.value
const sourceList = computed(() => computers.value) // ← 這行改成你的來源
// const sourceList = computed(() => filteredComputers.value)

const total = computed(() => sourceList.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const showPagination = computed(() => total.value > PAGE_SIZE)

// 目前頁面的資料
const pagedList = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return sourceList.value.slice(start, start + PAGE_SIZE)
})

// ✅ 當搜尋/篩選結果改變時，自動回到第一頁
watch([() => sourceList.value.length], () => {
    page.value = 1
})

// ✅ 防呆：當資料變少導致頁碼超過，拉回最後一頁
watch([totalPages], () => {
    if (page.value > totalPages.value) page.value = totalPages.value
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

// 載入 OU 選項
onMounted(async () => {
    const ous = await fetchOus()
    ouOptions.value = ous.map((o: any) => ({ id: o.id, ouname: o.ouname }))
    await load()
})

// 即時搜尋（簡單 debounce）
let t: any = null
watch([keyword, domainFilter, connFilter, accFilter], () => {
    clearTimeout(t)
    t = setTimeout(load, 250)
})

const openCreate = () => (showCreate.value = true)
const openEdit = (c: ComputerItem) => { editing.value = c; showEdit.value = true }
const closeEdit = () => { editing.value = null; showEdit.value = false }

const submitCreate = async (payload: any) => {
    await createComputer(payload)
    showCreate.value = false
    await load()
}

const submitEdit = async (payload: any) => {
    if (!editing.value) return
    await updateComputer(editing.value.id, payload)
    closeEdit()
    await load()
}

const openDeleteConfirm = () => { showDelete.value = true }
const confirmDelete = async () => {
    if (!editing.value) return
    await deleteComputer(editing.value.id)
    showDelete.value = false
    closeEdit()
    await load()
}

// chip 文案
const domainText = (v: string) => ({ Joined: '已加入網域', LeftDomain: '已離開網域', NotJoined: '未加入網域' }[v] || v)
const connText = (v: string) => ({ Online: '線上', Offline: '離線', LockedOut: '鎖定' }[v] || v)
const accText = (v: string) => ({ Enabled: '啟用中', Disabled: '停用中', Unused: '已建立但未啟用' }[v] || v)
</script>

<style scoped>
.filters {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap
}

.select,
.search {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, .55);
    background: rgba(15, 23, 42, .85);
    color: #e5e7eb;
    padding: 8px 12px
}

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

.toolbar-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 10px 0px;
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

/* Table */
.table-wrapper {
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    background: rgba(15, 23, 42, 0.95);
    overflow: hidden;
}

.table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid rgba(148, 163, 184, .35);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(15, 23, 42, .92)
}

.table th {
    font-weight: 500;
    color: #cbd5f5;
    white-space: nowrap;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, .18);
    text-align: left;
}

.table td {
    font-size: 13px;
    color: #e5e7eb;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148, 163, 184, .18);
    text-align: left;
}

.table tbody tr:hover {
    background: rgba(30, 64, 175, 0.35);
}

.link {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
}

.link:hover {
    color: #a5b4fc;
}

.empty {
    text-align: center;
    color: #9ca3af;
    padding: 18px
}

.chip {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px
}

.domain-Joined {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.domain-LeftDomain {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;

}

.domain-NotJoined {
    background: rgba(148, 163, 184, 0.15);
    color: #9ca3af;
}

.conn-Online {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.conn-Offline {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;

}

.conn-LockedOut {
    background: rgba(148, 163, 184, 0.15);
    color: #9ca3af;
}

.acc-Enabled {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.acc-Disabled {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;

}

.acc-Unused {
    background: rgba(148, 163, 184, 0.15);
    color: #9ca3af;
}
/* Pagination */
.pagination{
  margin-top: 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.65);
  /* border-radius: 10px; */
}

.pagination .info{
  font-size: 12px;
  color: rgba(226, 232, 240, 0.85);
}

.pagination .controls{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.pbtn{
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(2, 6, 23, 0.45);
  color: #e5e7eb;
  cursor: pointer;
  font-size: 13px;
}

.pbtn.active{
  border: none;
  background: #a855f7;
  color: #f9fafb;
}

.pbtn:disabled{
  opacity: .55;
  cursor: default;
}
</style>
