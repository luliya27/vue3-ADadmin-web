<template>
    <div class="ou-page">
        <section>
            <div class="title-block">
                <h2>組織單位管理</h2>
                <p class="subtitle">顯示 AD OU 的階層結構，目前以 SQLite 假資料模擬。</p>
            </div>
            <div class="toolbar-actions">
                <button class="btn-add" @click="openCreateModal">新 增</button>

                <div class="search-box">
                    <input v-model.trim="keyword" type="text" placeholder="搜尋 OU名稱 / 說明 / DN" />
                </div>
            </div>
        </section>

        <!-- Tree -->
        <section class="ou-tree">
            <template v-if="tree.length">
                <!-- OU樹狀 -->
                <OuNode v-for="node in tree" :key="node.id" :node="node" @edit="openEditModal" />
            </template>

            <div v-else class="empty">尚未建立任何組織單位</div>
        </section>

        <!-- 成功提示 -->
        <Transition name="fade">
            <div v-if="successMessage" class="success-toast">
                ✓ {{ successMessage }}
            </div>
        </Transition>

        <!-- 建立 OU -->
        <CreateOuModal v-if="showCreate" :dc-dn="dcDn" :ou-options="ouOptions" :ous="ouOptions" @close="showCreate = false"
            @submit="submitCreate" />
        <!-- 修改 / 刪除 OU -->
        <EditOuModal v-if="showEdit && editingOuForModal" :ou="editingOuForModal" :ou-options="ouOptions" :ous="ouOptions" @close="closeEdit"
            @submit="submitEdit" @delete="openDeleteConfirm" />
        <!-- 刪除防呆 -->
        <ConfirmDelete :visible="showDeleteConfirm" :ou="editingOu" @cancel="showDeleteConfirm = false" @confirm="confirmDelete" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, Transition } from 'vue'
import { useAdSettingsStore } from '@/stores/adSettings'
import {
    fetchOus,
    createOu,
    updateOu,
    deleteOu,
    type Ou,
} from '@/services/adadmin'

import OuNode from '../../components/OuNode.vue'
import CreateOuModal from '../../components/CreateOuModal.vue'
import EditOuModal from '../../components/EditOuModal.vue'
import ConfirmDelete from '../../components/ConfirmDeleteOu.vue'

type OuItem = Ou

const adSettingsStore = useAdSettingsStore()

const ous = ref<OuItem[]>([])
const keyword = ref('')
const successMessage = ref('')

const showCreate = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)
const editingOu = ref<OuItem | null>(null)

/* ---------- 系統設定 ---------- */
const dcDn = computed(() => adSettingsStore.settings?.dc_dn || '')

/* ---------- 載入 OU ---------- */
const loadOus = async () => {
    const list = await fetchOus()
    ous.value = list
}

/* ---------- 轉換為 OuOption（確保 id 為 number） ---------- */
const ouOptions = computed(() => 
    ous.value
        .filter((o): o is OuItem & { id: NonNullable<OuItem['id']> } => o.id !== undefined && o.id !== null)
        .map(o => ({
            ...o,
            id: typeof o.id === 'string' ? parseInt(o.id, 10) : (o.id as number),
            parent_id: o.parent_id ? (typeof o.parent_id === 'string' ? parseInt(o.parent_id, 10) : o.parent_id) : null,
            parentou: o.parentou ?? 0
        }))
)

onMounted(async () => {
    await adSettingsStore.init()
    await loadOus()
})

/* ---------- 搜尋 ---------- */
const filtered = computed(() => {
    if (!keyword.value) return ous.value
    return ous.value.filter(o =>
        [o.ouname, o.description, o.ou_dn].some(v =>
            (v || '').includes(keyword.value)
        )
    )
})

/* ---------- Tree 結構 ---------- */
const tree = computed(() => {
    const map = new Map<string, any>()
    const roots: any[] = []

    for (const ou of filtered.value) {
        map.set(ou.ou_dn, { ...ou, children: [] })
    }

    for (const ou of filtered.value) {
        const node = map.get(ou.ou_dn)
        if (ou.parent_dn && map.has(ou.parent_dn)) {
            map.get(ou.parent_dn).children.push(node)
        } else {
            roots.push(node)
        }
    }

    return roots
})

/* ---------- Root OU 選項 ---------- */
// ✅ 只取 root OU（parent_dn 為 NULL）
// 隱藏
// const rootOuOptions = computed(() =>
//     ous.value.filter(o => !o.parent_dn)
// )

/* ---------- 新增 ---------- */
const openCreateModal = () => {
    showCreate.value = true
}

const submitCreate = async (payload: {
    ouname: string
    description: string
    parent_dn?: string | null
    parent_id?: number | null
    parentou?: number
}) => {
    // 轉換新格式為後端期望的舊格式
    const apiPayload: any = {
        parentOuName: payload.ouname,
        description: payload.description
    }

    // 如果是子層 OU（parentou = 1），需要找到父層 OU 的名稱
    if (payload.parentou === 1 && payload.parent_dn) {
        const parentOu = ous.value.find(o => o.ou_dn === payload.parent_dn)
        if (parentOu) {
            // 後端格式：parentOuName 是父層名稱，childOuName 是當前 OU 名稱
            apiPayload.parentOuName = parentOu.ouname
            apiPayload.childOuName = payload.ouname
        }
    }

    await createOu(apiPayload)
    showCreate.value = false
    successMessage.value = '已成功新增組織單位'
    setTimeout(() => {
        successMessage.value = ''
    }, 3000)
    await loadOus()
}

/* ---------- 修改 ---------- */
const openEditModal = (ou: OuItem) => {
    editingOu.value = ou
    showEdit.value = true
}

const closeEdit = () => {
    editingOu.value = null
    showEdit.value = false
}

// 轉換 editingOu 為 EditOuModal 所需的類型
const editingOuForModal = computed(() => {
    if (!editingOu.value) return null
    return {
        ...editingOu.value,
        id: typeof editingOu.value.id === 'string' ? parseInt(editingOu.value.id, 10) : (editingOu.value.id as number),
        parent_id: editingOu.value.parent_id ? (typeof editingOu.value.parent_id === 'string' ? parseInt(editingOu.value.parent_id, 10) : editingOu.value.parent_id) : null,
        parentou: editingOu.value.parentou ?? 0
    }
})

const submitEdit = async (data: any) => {
    if (!editingOu.value) return

    // 如果有子 OU 名稱，先新增子 OU
    if (data.childOuName) {
        await createOu({
            parentOuName: editingOu.value.ouname,
            childOuName: data.childOuName,
            description: ''
        })
    }

    // 更新 OU 的各項屬性
    const updatePayload: any = {}

    // description 一定要傳
    updatePayload.description = data.description

    // 若修改了 ou_dn（同時包含 parent_dn 和 parentou 的改變）
    if (data.ou_dn && data.ou_dn !== editingOu.value.ou_dn) {
        updatePayload.ou_dn = data.ou_dn
    }

    // 若修改了層級關係（parent_dn、parent_id 和 parentou）
    if (data.parent_dn !== undefined) {
        updatePayload.parent_dn = data.parent_dn
    }
    if (data.parent_id !== undefined) {
        updatePayload.parent_id = data.parent_id
    }
    if (data.parentou !== undefined) {
        updatePayload.parentou = data.parentou
    }

    await updateOu(editingOu.value.id!, updatePayload)
    closeEdit()
    successMessage.value = '已成功更新組織單位'
    setTimeout(() => {
        successMessage.value = ''
    }, 3000)
    await loadOus()
}

/* ---------- 刪除 ---------- */
const openDeleteConfirm = () => {
    showDeleteConfirm.value = true
}

const confirmDelete = async () => {
    if (!editingOu.value) return
    await deleteOu(editingOu.value.id!)
    showDeleteConfirm.value = false
    closeEdit()
    await loadOus()
}
</script>

<style scoped>
/* Toolbar */
.toolbar {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
}

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
    margin: 10px 0px 11px 0px;
}

.search-box input {
    padding: 6px 10px;
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 13px;
    min-width: 260px;
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

/* Tree wrapper */
.tree-wrapper {
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    background: rgba(15, 23, 42, 0.95);
}

.tree-header {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    font-size: 12px;
    border-bottom: 1px solid rgba(30, 41, 59, 0.8);
}

.tree-body {
    max-height: 540px;
    overflow: auto;
    padding: 6px 4px 8px;
}

/* Tree list */
.ou-tree {
    list-style: none;
    /* margin: 0; */
    margin-top: -10px;
    padding: 0;
}

.ou-node-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 3px 6px;
    cursor: pointer;
}

.ou-node-row:hover {
    background: rgba(30, 64, 175, 0.35);
}

.ou-node-toggle {
    width: 14px;
    font-size: 12px;
    opacity: 0.8;
}

.ou-node-name {
    font-size: 13px;
}

.ou-node-type {
    /* color: #11192c !important; */
    margin-left: auto;
    padding: 2px 6px;
    font-size: 11px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.8);
}

/* Children list */
.ou-children {
    list-style: none;
    margin: 0;
    padding: 0;
}

ul.ou-children {
    list-style: none !important;
}

/* Messages */
.empty {
    padding: 18px;
    text-align: center;
    font-size: 13px;
    color: #9ca3af;
}

.error {
    color: #fca5a5;
}

.loading {
    color: #a5b4fc;
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
</style>
