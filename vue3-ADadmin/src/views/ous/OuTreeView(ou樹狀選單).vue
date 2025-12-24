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
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import type { Ou, OuType } from '@/services/adadmin'
import { fetchOus } from '@/services/adadmin'

/* -------- state -------- */
const ous = ref<Ou[]>([])
const loading = ref(false)
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

ul.ou-children{
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
