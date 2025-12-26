<template>
    <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
        <div class="modal">
            <header class="modal-header">
                <div>
                    <h3>
                        群組成員 -
                        <span class="mono">{{ group?.groupname }}</span>
                    </h3>
                    <p class="subtitle">
                        {{ group?.description || '—' }}
                    </p>
                </div>
                <button class="close-btn" @click="emit('close')">✕</button>
            </header>

            <section class="modal-body">
                <div v-if="loading" class="center-text">載入中...</div>
                <div v-else-if="error" class="error">{{ error }}</div>
                <div v-else-if="members.length === 0" class="center-text">
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
                        <tr v-for="u in members" :key="u.username">
                            <td class="mono">{{ u.username }}</td>
                            <td>{{ u.display_name }}</td>
                            <td class="mono">{{ u.email }}</td>
                            <td>{{ u.department || '-' }}</td>
                            <td class="mono">
                                <div>{{ u.ouname || '未指定' }}</div>
                            </td>
                            <td>
                                <div v-if="u.ou_dn" class="ou-dn">
                                    {{ u.ou_dn }}
                                </div>
                            </td>
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
                <button class="primary-btn" @click="emit('close')">關閉</button>
            </footer>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Group, User } from '@/services/adadmin'
import { fetchGroupMembers } from '@/services/adadmin'

const props = defineProps<{
    visible: boolean
    group: Group | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const members = ref<User[]>([])
const loading = ref(false)
const error = ref('')

const statusLabel = (status: string) => {
    switch (status) {
        case 'active': return '啟用中'
        case 'locked': return '已鎖定'
        case 'disabled': return '已停用'
        default: return status
    }
}

const loadMembers = async () => {
    if (!props.group) return
    loading.value = true
    error.value = ''
    members.value = []
    try {
        members.value = await fetchGroupMembers(props.group.groupname)
    } catch (err) {
        console.error(err)
        error.value = '載入群組成員失敗'
    } finally {
        loading.value = false
    }
}

watch(
    () => props.visible,
    (v) => {
        if (v) {
            loadMembers()
        }
    }
)
</script>

<style scoped>
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
    /* width: 900px; */
    min-width: 800px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.modal-header {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(30, 41, 59, 0.9);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.modal-header h3 {
    margin: 0;
    font-size: 16px;
}

.subtitle {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: #9ca3af;
}

.close-btn {
    border: none;
    background: transparent;
    color: #9ca3af;
    font-size: 16px;
    cursor: pointer;
    flex-shrink: 0;
    margin-left: 10px;
}

.modal-body {
    padding: 12px;
    overflow: auto;
    flex: 1;
}

.modal-footer {
    padding: 10px 12px;
    border-top: 1px solid rgba(30, 41, 59, 0.9);
    display: flex;
    justify-content: flex-end;
}

.center-text {
    text-align: center;
    color: #9ca3af;
    padding: 20px;
}

.error {
    color: #fca5a5;
    font-size: 13px;
    padding: 10px;
}

/* member table */
.member-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.member-table th,
.member-table td {
    padding: 6px 6px;
    border-bottom: 1px solid rgba(30, 41, 59, 0.8);
    text-align: left;
}

.member-table th {
    font-weight: 500;
    color: #9ca3af;
}

.member-table td {
    color: #e5e7eb;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.ou-dn {
    font-size: 11px;
    opacity: 0.7;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.status-pill {
    display: inline-flex;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
}

.status-pill.active {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
}

.status-pill.locked {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
}

.status-pill.disabled {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
}

.primary-btn {
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid #6366f1;
    background: radial-gradient(circle at top left, #4f46e5, #7c3aed);
    color: #e5e7eb;
    cursor: pointer;
}
</style>