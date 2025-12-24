<template>
    <div class="modal-mask" @click.self="$emit('close')">
        <div class="modal-card">
            <div class="modal-header">
                <div class="title">修改電腦</div>
                <button class="close" type="button" @click="$emit('close')">×</button>
            </div>

            <div class="modal-body">
                <div v-if="error" class="error-message">
                    ⚠️ {{ error }}
                </div>
                <div class="row">
                    <div class="field">
                        <label>電腦名稱：</label>
                        <input v-model.trim="cpname" class="input" />
                    </div>

                    <div class="field">
                        <label>OS：</label>
                        <input v-model.trim="os" class="input" />
                    </div>
                </div>

                <div class="row">
                    <div class="field checkbox">
                        <label>加入網域：</label>
                        <input type="checkbox" v-model="joinedDomain" />
                    </div>
                </div>

                <div v-if="joinedDomain" class="row">
                    <div class="field">
                        <label>選擇 OU：</label>
                        <select v-model="ouId" class="input">
                            <option value="">未指定</option>
                            <option v-for="ou in ouOptions" :key="ou.id" :value="String(ou.id)">
                                {{ ou.ouname }}
                            </option>
                        </select>
                    </div>

                    <div class="field">
                        <label>電腦帳戶狀態：</label>
                        <select v-model="ComputerAccount_inADStatus" class="input">
                            <option value="Enabled">啟用中</option>
                            <option value="Disabled">停用中</option>
                            <option value="Unused">已建立但未啟用</option>
                        </select>
                    </div>
                </div>

                <div v-if="joinedDomain" class="row">
                    <div class="field">
                        <label>網域加入狀態：</label>
                        <!-- Joined / NotJoined 由 checkbox 控制；保留 LeftDomain 手動選 -->
                        <select v-model="DomainMembershipStatus" class="input">
                            <option value="LeftDomain">已離開網域</option>
                            <option value="Joined">已加入網域</option>
                        </select>
                    </div>

                    <div class="field">
                        <label>連線狀態：</label>
                        <select v-model="ConnectivityStatus" class="input">
                            <option value="Online">線上</option>
                            <option value="Offline">離線</option>
                            <option value="LockedOut">鎖定</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="modal-footer between">
                <button class="btn danger" type="button" @click="$emit('delete')">刪除</button>
                <div class="right">
                    <!-- <button class="btn ghost" type="button" @click="$emit('close')">取消</button> -->
                    <button class="btn primary" type="button" :disabled="!canSubmit" @click="submit">
                        儲存
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type OuOption = { id: number; ouname: string }

type ComputerItem = {
    id: number
    cpname: string
    os: string
    ouname: string | null
    ou_id: number | null
    DomainMembershipStatus: 'Joined' | 'LeftDomain' | 'NotJoined'
    ConnectivityStatus: 'Online' | 'Offline' | 'LockedOut'
    ComputerAccount_inADStatus: 'Enabled' | 'Disabled' | 'Unused'
}

const props = defineProps<{
    computer: ComputerItem
    ouOptions: OuOption[]
    computers?: ComputerItem[]
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'delete'): void
    (e: 'submit', payload: Partial<ComputerItem>): void
}>()

const cpname = ref('')
const os = ref('')
const ouId = ref<string>('')

const joinedDomain = ref(false)
const DomainMembershipStatus = ref<'Joined' | 'LeftDomain' | 'NotJoined'>('NotJoined')

const ConnectivityStatus = ref<'Online' | 'Offline' | 'LockedOut'>('Offline')
const ComputerAccount_inADStatus = ref<'Enabled' | 'Disabled' | 'Unused'>('Unused')

const error = ref('')

watch(
    () => props.computer,
    (c) => {
        cpname.value = c.cpname
        os.value = c.os
        ouId.value = c.ou_id ? String(c.ou_id) : ''

        joinedDomain.value = c.DomainMembershipStatus === 'Joined'
        DomainMembershipStatus.value = c.DomainMembershipStatus

        ConnectivityStatus.value = c.ConnectivityStatus
        ComputerAccount_inADStatus.value = c.ComputerAccount_inADStatus

        error.value = ''
    },
    { immediate: true }
)

// 勾選加入網域 => 強制 Joined
watch(joinedDomain, (v) => {
    if (v) DomainMembershipStatus.value = 'Joined'
    else {
        // 取消勾選時，預設回 NotJoined（也可保留原狀，但你 UI 會比較混亂）
        if (DomainMembershipStatus.value === 'Joined') DomainMembershipStatus.value = 'NotJoined'
    }
})

const selectedOu = computed(() => {
    const id = Number(ouId.value)
    if (!ouId.value) return null
    return props.ouOptions.find(o => o.id === id) || null
})

const canSubmit = computed(() => {
    return !!cpname.value.trim() && !!os.value.trim()
})

const submit = () => {
    if (!canSubmit.value) return

    const newCpname = cpname.value.trim()
    const hasCpnameChanged = newCpname !== props.computer.cpname

    if (hasCpnameChanged && props.computers) {
        const isDuplicate = props.computers.some(c => c.cpname === newCpname)
        if (isDuplicate) {
            error.value = '建立失敗（可能電腦名稱已存在）'
            return
        }
    }

    const ou = selectedOu.value
    emit('submit', {
        cpname: cpname.value.trim(),
        os: os.value.trim(),
        ouname: joinedDomain.value ? (ou ? ou.ouname : null) : null,
        ou_id: joinedDomain.value ? (ou ? ou.id : null) : null,
        DomainMembershipStatus: DomainMembershipStatus.value,
        ConnectivityStatus: joinedDomain.value ? ConnectivityStatus.value : 'Offline',
        ComputerAccount_inADStatus: joinedDomain.value ? ComputerAccount_inADStatus.value : 'Unused',
    })
}
</script>

<style scoped>
.modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, .62);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 50
}

.modal-card {
    width: min(980px, 100%);
    background: rgba(15, 23, 42, .96);
    border: 1px solid rgba(148, 163, 184, .3);
    border-radius: 18px;
    overflow: hidden
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(148, 163, 184, .2)
}

.title {
    font-size: 18px;
    font-weight: 700;
    color: #e5e7eb
}

.close {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, .35);
    background: rgba(2, 6, 23, .5);
    color: #e5e7eb;
    cursor: pointer
}

.modal-body {
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.row {
    display: flex;
    gap: 18px;
    flex-wrap: wrap
}

.field {
    flex: 1 1 420px;
    display: flex;
    flex-direction: column;
    gap: 8px
}

.field.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    flex: 0 0 240px
}

label {
    font-size: 14px;
    color: rgba(226, 232, 240, .9)
}

.input {
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, .55);
    background: rgba(15, 23, 42, .85);
    color: #e5e7eb;
    font-size: 14px;
    padding: 9px 14px;
    outline: none
}

.input.dark {
    background: #020617
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
    font-size: 14px
}

.btn.primary {
    border: none;
    background: #a855f7;
    color: #f9fafb
}

.btn.danger {
    border: none;
    background: rgba(239, 68, 68, .95);
    color: #fff
}

.btn:disabled {
    opacity: .55;
    cursor: default
}

.error {
    margin-top: 4px;
    color: #fca5a5;
    font-size: 13px
}

.error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 12px 14px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 14px;
}
</style>
