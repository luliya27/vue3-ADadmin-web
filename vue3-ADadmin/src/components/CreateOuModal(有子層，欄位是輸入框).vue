<template>
    <div class="mask" @click.self="$emit('close')">
        <div class="modal">
            <div class="header">
                <div class="title">建立組織單位</div>
                <button class="x" @click="$emit('close')">×</button>
            </div>

            <div class="body">
                <div class="row">
                    <div class="field">
                        <label>父 OU 名稱（HeadOffice）：</label>
                        <input v-model.trim="parentOuName" class="input" list="rootOuList"
                            placeholder="例如：HeadOffice" />
                        <datalist id="rootOuList">
                            <option v-for="ou in ouOptions" :key="ou.id" :value="ou.ouname" />
                        </datalist>
                    </div>

                    <div class="field">
                        <label>OU別名（部門）：</label>
                        <input v-model.trim="description" class="input" placeholder="例如：資訊部" />
                    </div>
                </div>

                <div class="row">
                    <div class="field checkbox">
                        <label>建立子層 OU（IT 在 HeadOffice 底下）：</label>
                        <input type="checkbox" v-model="enableChild" />
                    </div>

                    <div class="field" v-if="enableChild">
                        <label>子 OU 名稱（IT）：</label>
                        <input v-model.trim="childOuName" class="input" placeholder="例如：IT" />
                    </div>
                </div>


                <div class="row">
                    <div class="field full">
                        <label>OU_DN（自動產生）：</label>
                        <input :value="ouDnPreview" class="input dark" readonly />
                        <div v-if="!dcDn" class="warn">尚未設定 DC DN（請先到「系統設定」儲存網域）</div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <button class="btn ghost" @click="$emit('close')">取消</button>
                <button class="btn primary" :disabled="!canSubmit" @click="submit">儲存</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
    dcDn: string
    ouOptions: Array<{ id: number; ouname: string; ou_dn: string }>
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'submit', payload: { parentOuName: string; childOuName?: string; description: string }): void
}>()

const parentOuName = ref('')
const childOuName = ref('')
const description = ref('')
const enableChild = ref(false)

const dcDn = computed(() => (props.dcDn || '').trim())

const ouDnPreview = computed(() => {
    if (!dcDn.value) return ''
    const parent = parentOuName.value.trim()
    const child = childOuName.value.trim()

    if (!parent) return dcDn.value

    // 無子層：OU=HeadOffice,DC=...
    if (!enableChild.value) return `OU=${parent},${dcDn.value}`

    // 有子層：OU=IT,OU=HeadOffice,DC=...
    if (!child) return `OU=${parent},${dcDn.value}`
    return `OU=${child},OU=${parent},${dcDn.value}`
})

const canSubmit = computed(() => {
    if (!dcDn.value) return false
    if (!parentOuName.value.trim()) return false
    if (enableChild.value && !childOuName.value.trim()) return false
    return true
})

const submit = () => {
    const payload: any = {
        parentOuName: parentOuName.value.trim(),
        description: description.value.trim(),
    }
    if (enableChild.value) payload.childOuName = childOuName.value.trim()
    emit('submit', payload)
}
</script>

<style scoped>
.mask {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.62);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 50;
}

.modal {
    width: min(860px, 100%);
    background: rgba(15, 23, 42, 0.96);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 18px;
    overflow: hidden;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.title {
    font-size: 16px;
    font-weight: 700;
    color: #e5e7eb;
}

.x {
    width: 32px;
    height: 32px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(2, 6, 23, 0.5);
    color: #e5e7eb;
    cursor: pointer;
}

.body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
}

.field {
    flex: 1 1 360px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field.full {
    flex-basis: 100%;
}

.field.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

label {
    font-size: 13px;
    color: rgba(226, 232, 240, 0.9);
}

.input {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.55);
    background: rgba(15, 23, 42, 0.85);
    color: #e5e7eb;
    font-size: 13px;
    padding: 8px 12px;
}

.input.dark {
    background: #020617;
}

.warn {
    margin-top: 6px;
    font-size: 12px;
    color: #fca5a5;
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 16px;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.btn {
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(2, 6, 23, 0.5);
    color: #e5e7eb;
    cursor: pointer;
    font-size: 13px;
}

.btn.primary {
    border: none;
    background: #a855f7;
    color: #f9fafb;
}

.btn:disabled {
    opacity: 0.55;
    cursor: default;
}
</style>
