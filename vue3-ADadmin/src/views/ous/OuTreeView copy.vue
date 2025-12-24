<template>
    <div class="ou-page">
        <!-- Header -->
        <div class="ou-header">
            <div>
                <h2>組織單位管理</h2>
                <p class="hint">顯示 AD OU 的階層結構，目前以 SQLite 假資料模擬</p>
            </div>

            <div class="actions">
                <button class="btn-add" @click="openCreateModal">新增</button>
                <input v-model.trim="keyword" class="search" placeholder="搜尋 OU名稱 / 說明 / DN" />
            </div>
        </div>

        <!-- Tree -->
        <div class="ou-tree">
            <template v-if="tree.length">
                <ul>
                    <OuNode v-for="node in tree" :key="node.id" :node="node" @edit="openEditModal" />
                </ul>
            </template>

            <div v-else class="empty">尚未建立任何組織單位</div>
        </div>

        <!-- 建立 OU -->
        <!-- <CreateOuModal v-if="showCreate" :dc-dn="dcDn" :ou-options="rootOuOptions" @close="showCreate = false"
            @submit="submitCreate" /> -->
        <CreateOuModal v-if="showCreate" :dc-dn="dcDn" :ou-options="ous" @close="showCreate = false"
            @submit="submitCreate" />
        <!-- 修改 / 刪除 OU -->
        <EditOuModal v-if="showEdit && editingOu" :ou="editingOu" :ou-options="ous" :dc-dn="dcDn" @close="closeEdit"
            @submit="submitEdit" @delete="openDeleteConfirm" />
        <!-- 刪除防呆 -->
        <ConfirmDelete v-if="showDeleteConfirm" @cancel="showDeleteConfirm = false" @confirm="confirmDelete" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAdSettingsStore } from '@/stores/adSettings'
import {
    fetchOus,
    createOu,
    updateOu,
    deleteOu,
} from '@/services/adadmin'

import OuNode from '../../components/OuNode.vue'
import CreateOuModal from '../../components/CreateOuModal.vue'
import EditOuModal from '../../components/EditOuModal.vue'
import ConfirmDelete from '../../components/ConfirmDeleteOu.vue'

type OuItem = {
    id: number
    ou_dn: string
    ouname: string
    description: string
    parent_dn: string | null
    parentou: number
}

const adSettingsStore = useAdSettingsStore()

const ous = ref<OuItem[]>([])
const keyword = ref('')

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
    parentOuName: string
    childOuName?: string
    description: string
}) => {
    await createOu(payload)
    showCreate.value = false
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
/* ---------- 提交修改 ---------- */
// const submitEdit = async (data: { description: string; childOuName?: string }) => {
//     if (!editingOu.value) return

//     // 如果有子 OU 名稱，先新增子 OU
//     if (data.childOuName) {
//         await createOu({
//             parentOuName: editingOu.value.ouname,
//             childOuName: data.childOuName,
//             description: ''
//         })
//     }

//     // 更新父 OU 的 description
//     await updateOu(editingOu.value.id, { description: data.description })
//     closeEdit()
//     await loadOus()
// }

const submitEdit = async (data: { description: string; parentou: number; parent_dn: string | null }) => {
    if (!editingOu.value) return
    try {
        await updateOu(editingOu.value.id, data)
        closeEdit()
        await loadOus() // ✅ 立即刷新 tree
    } catch (err: any) {
        console.error(err)
        alert(err?.response?.data?.message || '更新 OU 失敗')
    }
}

// const submitEdit = async (data: {
//     description: string; parentou: number; parent_dn: string | null
// }) => {
//     await updateOu(editingOu.value.id, data)
//     closeEdit()
//     await loadOus()
// }
/* ---------- 刪除 ---------- */
const openDeleteConfirm = () => {
    showDeleteConfirm.value = true
}

const confirmDelete = async () => {
    if (!editingOu.value) return
    await deleteOu(editingOu.value.id)
    showDeleteConfirm.value = false
    closeEdit()
    await loadOus()
}
</script>

<style scoped>
.ou-tree-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

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
    font-size: 12px;
    color: #9ca3af;
}

.toolbar-actions {
    display: flex;
    align-items: center;
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
    margin: 0;
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
</style>