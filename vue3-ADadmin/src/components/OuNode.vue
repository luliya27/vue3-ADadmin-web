<template>
    <li class="node">
        <div class="row">
            <button class="toggle" type="button" :disabled="!hasChildren" @click="expanded = !expanded"
                :title="hasChildren ? (expanded ? '收合' : '展開') : ''">
                <span v-if="hasChildren" :class="['arrow', expanded ? 'down' : 'right']"></span>
            </button>

            <div class="cell name">
                <div class="ouname">{{ node.ouname }}</div>
                <div class="dn">{{ node.ou_dn }}</div>
            </div>

            <div class="cell desc" title="雙擊編輯" @dblclick="$emit('edit', node)">
                {{ node.description || '—' }}
            </div>

            <div class="cell badge">
                <span v-if="hasChildren" class="chip">有子層</span>
                <span v-else class="chip muted">無子層</span>
            </div>
        </div>

        <ul v-if="hasChildren && expanded" class="children">
            <OuNode v-for="c in node.children" :key="c.id" :node="c" @edit="$emit('edit', $event)" />
        </ul>
    </li>
</template>

<script lang="ts">
export default {
    name: 'OuNode'
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
    node: any
}>()

defineEmits<{
    (e: 'edit', ou: any): void
}>()

const expanded = ref(true)
const hasChildren = computed(() => Array.isArray(props.node.children) && props.node.children.length > 0)
</script>

<style scoped>
.node {
    list-style: none;
    margin: 0;
    /* padding: 0; */
    padding-top: 8px;
}

.row {
    display: grid;
    grid-template-columns: 28px 1.3fr 1fr 110px;
    gap: 12px;
    align-items: center;
    padding: 10px 10px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.7);
}

.row:hover {
    border-color: rgba(168, 85, 247, 0.6);
    background: rgba(15, 23, 42, 0.85);
}

.children {
    margin: 10px 0 0 22px;
    padding: 0;
    display: flex;
    flex-direction: column;
    /* gap: 10px; */
}

.toggle {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 10px;
}

.toggle:disabled {
    cursor: default;
    opacity: 0.4;
}

.arrow {
    display: inline-block;
    width: 0;
    height: 0;
    border-style: solid;
}

.arrow.right {
    border-width: 6px 0 6px 8px;
    border-color: transparent transparent transparent rgba(226, 232, 240, 0.9);
}

.arrow.down {
    border-width: 8px 6px 0 6px;
    border-color: rgba(226, 232, 240, 0.9) transparent transparent transparent;
}

.cell {
    min-width: 0;
    color: #e5e7eb;
    font-size: 13px;
}

.name .ouname {
    font-size: 14px;
    font-weight: 600;
}

.name .dn {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(148, 163, 184, 0.95);
    word-break: break-all;
}

.desc {
    color: rgba(226, 232, 240, 0.95);
    cursor: default;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px dashed rgba(148, 163, 184, 0.35);
    background: rgba(2, 6, 23, 0.35);
    user-select: none;
}

.desc:hover {
    border-color: rgba(168, 85, 247, 0.7);
    cursor: pointer;
}

.badge {
    display: flex;
    justify-content: flex-end;
}

.chip {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    border: 1px solid rgba(168, 85, 247, 0.65);
    color: #f3e8ff;
    background: rgba(168, 85, 247, 0.18);
}

.chip.muted {
    border-color: rgba(148, 163, 184, 0.35);
    color: rgba(226, 232, 240, 0.75);
    background: rgba(148, 163, 184, 0.08);
}
</style>
