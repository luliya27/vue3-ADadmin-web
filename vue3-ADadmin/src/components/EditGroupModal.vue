<template>
    <div v-if="visible && group" class="modal-mask" @click.self="emit('close')">
        <div class="modal-card">
            <header class="modal-header">
                <div class="title">編輯群組</div>
                <button class="close" @click="emit('close')">×</button>
            </header>

            <div class="modal-body">
                <div v-if="errorMessage" class="error-message">
                    ⚠️ {{ errorMessage }}
                </div>
                <div class="row">
                    <div class="field">
                        <label>群組名稱：</label>
                        <input v-model.trim="form.groupname" class="input" placeholder="請輸入群組名稱" />
                    </div>
                    <div class="field">
                        <label>描述：</label>
                        <input v-model.trim="form.description" class="input" placeholder="請輸入描述" />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>群組類型：</label>
                        <select v-model="form.grouptype">
                            <option value="security-global">安全性群組 / 全域</option>
                            <option value="security-domainlocal">安全性群組 / 網域</option>
                            <option value="security-universal">安全性群組 / 萬用</option>
                            <option value="distribution">通訊群組</option>
                        </select>
                    </div>
                </div>
            </div>

            <footer class="modal-footer between">
                <button class="btn danger" :disabled="saving" @click="emit('delete')">刪除</button>
                <div class="right">
                    <!-- <button class="btn ghost" @click="emit('close')">取消</button> -->
                    <button class="btn primary" :disabled="saving" @click="onSave">
                        {{ saving ? '儲存中…' : '儲存' }}
                    </button>
                </div>
            </footer>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Group, GroupType } from '@/services/adadmin'
import { updateGroup } from '@/services/adadmin'

const props = defineProps<{
    visible: boolean
    group: Group | null
    groups?: Group[]
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'updated'): void
    (e: 'delete'): void
}>()

const saving = ref(false)
const errorMessage = ref('')

const form = reactive<{
    groupname: string
    description: string
    grouptype: GroupType
}>({
    groupname: '',
    description: '',
    grouptype: 'distribution',
})

watch(
    () => props.group,
    (g) => {
        if (!g) return
        errorMessage.value = ''
        form.groupname = g.groupname
        form.description = g.description || ''
        form.grouptype = g.grouptype
    },
    { immediate: true }
)

const onSave = async () => {
    if (!props.group) return
    errorMessage.value = ''

    if (!form.groupname.trim()) {
        errorMessage.value = '群組名稱不可為空'
        return
    }

    const newGroupname = form.groupname.trim()
    const hasGroupnameChanged = newGroupname !== props.group.groupname

    if (hasGroupnameChanged && props.groups) {
        const isDuplicate = props.groups.some(g => g.groupname === newGroupname)
        if (isDuplicate) {
            errorMessage.value = '建立失敗（可能群組名稱已存在）'
            return
        }
    }

    try {
        saving.value = true
        await updateGroup(props.group.id, {
            groupname: form.groupname,
            description: form.description,
            grouptype: form.grouptype,
        })
        emit('updated')
        emit('close')
    } catch (e: any) {
        errorMessage.value = e?.response?.data?.message || '儲存失敗'
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50
}

.modal-card {
    width: min(980px, 100%);
    background: rgba(15, 23, 42, .96);
    border: 1px solid rgba(148, 163, 184, .3);
    border-radius: 18px;
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(148, 163, 184, .2);
}

.title {
    font-size: 18px;
    font-weight: 700;
    color: #e5e7eb;
}

.close {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, .35);
    background: rgba(2, 6, 23, .5);
    color: #e5e7eb;
    cursor: pointer;
}

.modal-body {
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 14px
}

.field {
    display: flex;
    flex-direction: column;
    gap: 8px
}

label {
    color: rgba(255, 255, 255, .85)
}

.input {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, .55);
    background: rgba(15, 23, 42, .85);
    color: #e5e7eb;
    font-size: 14px;
    padding: 9px 14px;
    outline: none;
}

.input.dark {
    background: #020617;
}

select {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, .55);
    background: rgba(15, 23, 42, .85);
    color: #fff;
    padding: 9px 14px;
    outline: none
}

.error {
    margin-top: 10px;
    color: #ff8080
}

.error-message {
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    font-size: 13px;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.modal-footer {
    display: flex;
    padding: 14px 16px;
    border-top: 1px solid rgba(148, 163, 184, .2)
}

.modal-footer.between {
    justify-content: space-between;
    align-items: center
}

.right {
    display: flex;
    gap: 10px
}

.btn {
    height: 38px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, .35);
    background: rgba(2, 6, 23, .5);
    color: #e5e7eb;
    cursor: pointer;
    font-size: 14px;
}

.btn.primary {
    border: none;
    background: #a855f7;
    color: #f9fafb;
}

.btn.danger {
    background: rgba(220, 68, 68, .9);
    border-color: transparent
}

.btn.ghost {
    background: transparent
}

.btn:disabled {
    opacity: .6;
    cursor: not-allowed
}

@media (max-width:900px) {
    .row {
        grid-template-columns: 1fr
    }
}
</style>
