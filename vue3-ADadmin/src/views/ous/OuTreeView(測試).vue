<template>
    <div class="ou-tree-page">
        <!-- Toolbar -->
        <section class="toolbar">
            <div class="title-block">
                <h2>組織單位管理</h2>
                <p class="subtitle">
                    顯示 AD OU 的階層結構，目前以 SQLite 假資料開發，後續可改為實際 AD 匯入。
                </p>
            </div>

            <div class="toolbar-actions">
                <div class="search-box">
                    <input v-model.trim="keyword" type="text" placeholder="搜尋 OU 名稱 / 說明 / DN" />
                </div>
            </div>
        </section>

        <!-- Tree 區 -->
        <section class="tree-wrapper">
            <div class="tree-header">
                <span v-if="loading" class="loading">載入中...</span>
                <span v-else class="count">共 {{ ous.length }} 個 OU</span>
                <span v-if="errorMessage" class="error">{{ errorMessage }}</span>
            </div>

            <div class="tree-body">
                <ul v-if="filteredTree.length > 0" class="ou-tree">
                    <TreeNodeItem v-for="node in filteredTree" :key="node.ou_dn" :node="node" :level="0"
                        :is-expanded="isExpanded" :toggle="toggleNode" />
                </ul>

                <p v-else class="empty">沒有符合條件的組織單位</p>
            </div>
        </section>
    </div>
    <!-- 建立 OU Modal -->
    <div v-if="showCreate" class="modal-mask">
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">建立組織單位</div>
                <button class="modal-x" @click="showCreate = false">×</button>
            </div>

            <div class="modal-body">
                <div class="row">
                    <div class="field">
                        <label>OU名稱：</label>
                        <input v-model.trim="form.parentOuName" class="input" placeholder="例如 HeadOffice" />
                    </div>
                    <div class="field">
                        <label>OU別名（部門）：</label>
                        <input v-model.trim="form.description" class="input" placeholder="例如 資訊部" />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>開啟子層：</label>
                        <input type="checkbox" v-model="form.enableChild" />
                    </div>

                    <div class="field" v-if="form.enableChild">
                        <label>選擇子層OU：</label>
                        <select v-model="form.childOuName" class="input">
                            <option value="">請選擇</option>
                            <option v-for="name in childOptions" :key="name" :value="name">{{ name }}</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="field full">
                        <label>OU_DN：</label>
                        <input :value="ouDnPreview" class="input input-dark" readonly />
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn primary" @click="submitCreate">儲存</button>
            </div>
        </div>
    </div>
    <!-- 編輯 OU Modal -->
    <div v-if="showEdit" class="modal-mask">
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">修改組織單位</div>
                <button class="modal-x" @click="showEdit = false">×</button>
            </div>

            <div class="modal-body">
                <div class="row">
                    <div class="field">
                        <label>OU名稱：</label>
                        <input v-model.trim="form.parentOuName" class="input" readonly />
                    </div>
                    <div class="field">
                        <label>OU別名（部門）：</label>
                        <input v-model.trim="form.description" class="input" />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>開啟子層：</label>
                        <input type="checkbox" v-model="form.enableChild" />
                    </div>
                </div>

                <div class="row">
                    <div class="field full">
                        <label>OU_DN：</label>
                        <input :value="editingOu?.ou_dn || ''" class="input input-dark" readonly />
                    </div>
                </div>
            </div>

            <div class="modal-footer between">
                <button class="btn danger" @click="requestDelete">刪除</button>
                <button class="btn primary" @click="submitEdit">儲存</button>
            </div>
        </div>
    </div>
    <!-- 刪除防呆 Modal -->
    <div v-if="showDeleteConfirm" class="modal-mask">
        <div class="confirm-modal">
            <div class="confirm-icon">!</div>
            <div class="confirm-text">確定將組織單位刪除？</div>

            <div class="confirm-actions">
                <button class="btn success" @click="showDeleteConfirm = false">取消</button>
                <button class="btn danger" @click="confirmDelete">刪除</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAdSettingsStore } from '@/stores/adSettings'
import { fetchOus, createOu, updateOu, deleteOu } from '@/services/adadmin' // 你若還沒這些 API，我下段給你

type OuItem = {
    id: number
    ou_dn: string
    ouname: string
    description: string
    parentou: number // 0/1
}

const adSettingsStore = useAdSettingsStore()

const ous = ref<OuItem[]>([])
const loading = ref(false)

// --------- Modal state ---------
const showCreate = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)

const editingOu = ref<OuItem | null>(null)

// 建立/修改表單（依 Figma）
const form = reactive({
    parentOuName: '',      // 例如 HeadOffice（主OU名稱）
    description: '',       // 別名(部門) 例如 資訊部
    enableChild: false,    // 開啟子層
    childOuName: '',       // 子層 OU 名稱，例如 IT（下拉選單）
})

// 取得 dc_dn（從系統設定）
const dcDn = computed(() => adSettingsStore.settings?.dc_dn || '')

// 子層下拉：用現有 OU 名稱當選項（你也可以改成固定清單）
const childOptions = computed(() => {
    // 只取 ouname，不重複
    const set = new Set(ous.value.map(o => o.ouname).filter(Boolean))
    return Array.from(set).sort()
})

// OU_DN 預覽（不可編輯）
const ouDnPreview = computed(() => {
    if (!dcDn.value) return ''
    const base = dcDn.value.trim()

    // 無子層：OU=HeadOffice,DC=...
    if (!form.enableChild) {
        const parent = form.parentOuName.trim()
        if (!parent) return base
        return `OU=${parent},${base}`
    }

    // 有子層：OU=IT,OU=HeadOffice,DC=...
    const parent = form.parentOuName.trim()
    const child = form.childOuName.trim()
    if (!parent || !child) return base
    return `OU=${child},OU=${parent},${base}`
})

// 載入 OU 列表
const loadOus = async () => {
    loading.value = true
    try {
        ous.value = await fetchOus()
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await adSettingsStore.init()
    await loadOus()
})

// 開啟建立彈窗
const openCreateModal = () => {
    form.parentOuName = ''
    form.description = ''
    form.enableChild = false
    form.childOuName = ''
    showCreate.value = true
}

// 儲存建立
const submitCreate = async () => {
    const ou_dn = ouDnPreview.value
    if (!ou_dn) return

    // 你希望儲存的 ouname：無子層存 parent、有子層存 child
    const ouname = form.enableChild ? form.childOuName.trim() : form.parentOuName.trim()
    if (!ouname) return

    await createOu({
        ou_dn,
        ouname,
        description: form.description.trim(),
        parentou: form.enableChild ? 1 : 0, // 你定義「開啟子層」就視為有子層
    })

    showCreate.value = false
    await loadOus()
}

// 開啟修改彈窗
const openEditModal = (ou: OuItem) => {
    editingOu.value = ou

    // 這邊讓使用者修改「別名」為主，OU 名稱可以照你的 UI 決定是否允許改
    form.parentOuName = ou.ouname
    form.description = ou.description || ''
    form.enableChild = ou.parentou === 1
    form.childOuName = '' // 編輯時如果你想顯示子層，可再擴充解析 DN

    showEdit.value = true
}

// 儲存修改
const submitEdit = async () => {
    if (!editingOu.value) return

    // 編輯時：你可以只允許改 description / parentou
    await updateOu(editingOu.value.id, {
        description: form.description.trim(),
        parentou: form.enableChild ? 1 : 0,
    })

    showEdit.value = false
    editingOu.value = null
    await loadOus()
}

// 要求刪除
const requestDelete = () => {
    showDeleteConfirm.value = true
}

// 確認刪除
const confirmDelete = async () => {
    if (!editingOu.value) return

    await deleteOu(editingOu.value.id)

    showDeleteConfirm.value = false
    showEdit.value = false
    editingOu.value = null
    await loadOus()
}

/* -------- state -------- */
// const ous = ref<Ou[]>([])
// const loading = ref(false)
const errorMessage = ref('')

const keyword = ref('')

/* 展開狀態：用 ou_dn 當 key */
const expanded = ref<Record<string, boolean>>({})

/* 載入所有 OU */
const loadOus = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
        ous.value = await fetchOus()
    } catch (err) {
        console.error('loadOus error >>>', err)
        errorMessage.value = '載入組織單位失敗'
    } finally {
        loading.value = false
    }
}

/* -------------------------------
   取得 parent DN（從 DN 字串推導）
   例：
   OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com
   parent = OU=HeadOffice,DC=corp,DC=example,DC=com
-------------------------------- */
const getParentDn = (dn: string): string | null => {
    const idx = dn.indexOf(',')
    if (idx === -1) return null
    return dn.slice(idx + 1)
}

/* -------------------------------
   TreeNode 型別
-------------------------------- */
interface TreeNode extends Ou {
    children: TreeNode[]
    ouname: string
    ou_dn: string
    ou_type?: string
    description?: string
}

/* -------------------------------
   建立樹狀結構
-------------------------------- */
const buildTree = (list: Ou[]): TreeNode[] => {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    list.forEach((item) => {
        map.set(item.ou_dn, {
            ...item,
            children: [],
        })
    })

    map.forEach((node) => {
        const parentDn = getParentDn(node.ou_dn)
        if (parentDn && map.has(parentDn)) {
            map.get(parentDn)!.children.push(node)
        } else {
            roots.push(node)
        }
    })

    // 排序（依 ouname）
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => a.ouname.localeCompare(b.ouname, 'zh-Hant'))
        nodes.forEach((n) => sortNodes(n.children))
    }

    sortNodes(roots)
    return roots
}

/* -------------------------------
   搜尋：保留符合節點 & 其祖先
-------------------------------- */
const filterTree = (nodes: TreeNode[], kw: string): TreeNode[] => {
    if (!kw) return nodes
    const lowerKw = kw.toLowerCase()

    const matchNode = (node: TreeNode): boolean => {
        const text = `${node.ouname} ${node.description ?? ''} ${node.ou_dn}`.toLowerCase()
        return text.includes(lowerKw)
    }

    const dfs = (node: TreeNode): TreeNode | null => {
        const childrenMatches: TreeNode[] = []
        for (const child of node.children) {
            const r = dfs(child)
            if (r) childrenMatches.push(r)
        }

        if (matchNode(node) || childrenMatches.length > 0) {
            return { ...node, children: childrenMatches }
        }
        return null
    }

    const result: TreeNode[] = []
    for (const n of nodes) {
        const r = dfs(n)
        if (r) result.push(r)
    }
    return result
}

/* 組合樹資料 */
const treeData = computed<TreeNode[]>(() => buildTree(ous.value))
const filteredTree = computed<TreeNode[]>(() => filterTree(treeData.value, keyword.value))

/* -------------------------------
   展開/收合控制
-------------------------------- */
const isExpanded = (dn: string, hasChildren: boolean) => {
    if (!hasChildren) return false
    const v = expanded.value[dn]
    return v !== false // 預設展開
}

const toggleNode = (dn: string, hasChildren: boolean) => {
    if (!hasChildren) return
    expanded.value[dn] = !isExpanded(dn, hasChildren)
}

onMounted(() => {
    loadOus()
})

/* 搜尋變動時，不關閉展開狀態 */
watch(keyword, () => { })
/* -------------------------------
   TreeNodeItem 子元件（遞迴）
-------------------------------- */
const TreeNodeItem = defineComponent({
    name: 'TreeNodeItem',
    props: {
        node: {
            type: Object as () => TreeNode,
            required: true,
        },
        level: {
            type: Number,
            required: true,
        },
        isExpanded: {
            type: Function,
            required: true,
        },
        toggle: {
            type: Function,
            required: true,
        },
    },
    setup(props: any): any {
        const handleToggle = () => {
            props.toggle(props.node.ou_dn, props.node.children.length > 0)
        }

        return () => {
            const node = props.node as TreeNode
            const hasChildren = node.children.length > 0
            const expanded = props.isExpanded(node.ou_dn, hasChildren)

            return h('li', { class: 'ou-node' }, [
                h('div',
                    {
                        class: 'ou-node-row',
                        style: { paddingLeft: `${props.level * 16 + 8}px` },
                        onClick: handleToggle
                    },
                    [
                        h('span', { class: 'ou-node-toggle' }, hasChildren ? (expanded ? '▾' : '▸') : '•'),
                        h('span', { class: 'ou-node-name' }, node.ouname),
                        // h('span', { class: 'ou-node-type' }, node.ou_type || '')
                    ]
                ),
                hasChildren && expanded ? h('ul', { class: 'ou-children' },
                    node.children.map((child: TreeNode) =>
                        h(TreeNodeItem, {
                            key: child.ou_dn,
                            node: child,
                            level: props.level + 1,
                            isExpanded: props.isExpanded,
                            toggle: props.toggle
                        })
                    )
                ) : null
            ])
        }
    }
})
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
