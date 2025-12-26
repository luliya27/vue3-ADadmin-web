<template>
    <div class="modal-mask" @click.self="$emit('close')">
        <div class="modal-card">
            <div class="modal-header">
                <div class="title">建立使用者</div>
                <button class="close" type="button" @click="$emit('close')">×</button>
            </div>

            <div class="modal-body">
                <!-- 👈 新增：錯誤訊息提示 -->
                <div v-if="errorMessage" class="error-message">
                    ⚠️ {{ errorMessage }}
                </div>

                <div class="row">
                    <div class="field">
                        <label>帳號：</label>
                        <input v-model.trim="form.username" class="input" placeholder="例如：luliya" />
                    </div>
                    <div class="field">
                        <label>顯示名稱：</label>
                        <input v-model.trim="form.display_name" class="input" placeholder="例如：Luliya Xiao" />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>Email：</label>
                        <input v-model.trim="form.email" class="input" placeholder="例如：luliya@example.com" />
                    </div>
                    <div class="field">
                        <label>密碼：</label>
                        <input v-model.trim="form.passwordHash" class="input" placeholder="輸入密碼（目前先存字串）" />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>部門：</label>
                        <!-- ✅ Single select：選 OU -->
                        <Multiselect v-model="selectedDept" :options="departmentOptions" :searchable="true"
                            :allow-empty="true" placeholder="選擇部門" label="ouname" track-by="ou_dn"
                            class="multiselect-input" />
                    </div>

                    <div class="field">
                        <label>OU路徑：</label>
                        <input :value="ouDnPreview" class="input dark" readonly />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>群組：</label>
                        <!-- ✅ Simple select：多選群組 -->
                        <Multiselect v-model="selectedGroups" :options="groups" :searchable="true" :allow-empty="true"
                            :multiple="true" placeholder="選擇群組" label="groupname" track-by="groupname"
                            class="multiselect-input" />
                    </div>

                    <div class="field checkbox">
                        <label>是否啟用帳號：</label>
                        <input type="checkbox" v-model="enabled" />
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <!-- <button class="btn ghost" type="button" @click="$emit('close')">取消</button> -->
                <button class="btn primary" type="button" :disabled="!canSubmit" @click="submit">儲存</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Multiselect from 'vue-multiselect' // 引入 Multiselect 元件
import 'vue-multiselect/dist/vue-multiselect.css' // 引入 Multiselect 樣式
const props = defineProps<{
    ous: OuItem[]
    groups: GroupItem[]
    users?: User[] // 👈 新增：所有使用者清單，用於檢查帳號重複
}>()

import type { OuItem, GroupItem, User } from '@/services/adadmin'

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'submit', payload: {
        username: string
        display_name: string
        email: string
        passwordHash: string
        department: string | null
        ou: string | null
        groupsname: string | null
        status: 'active' | 'disabled'
    }): void
}>()

const form = ref({
    username: '',
    display_name: '',
    email: '',
    passwordHash: '',
})

const departmentOptions = computed(() => {
    return props.ous
})

const selectedDept = ref<OuItem | null>(null)
const selectedGroups = ref<GroupItem[]>([])
const enabled = ref(true)
const errorMessage = ref('') // 👈 新增：錯誤訊息

// 顯示 OU_DN
const ouDnPreview = computed(() => selectedDept.value?.ou_dn || '')

const canSubmit = computed(() => {
    return !!form.value.username.trim()
        && !!form.value.display_name.trim()
        && !!form.value.email.trim()
        && !!form.value.passwordHash.trim()
})

const submit = () => {
    errorMessage.value = '' // 清空錯誤訊息

    const newUsername = form.value.username.trim()

    // ✅ 檢查帳號是否重複
    if (props.users) {
        const isDuplicate = props.users.some(u => u.username === newUsername)
        if (isDuplicate) {
            errorMessage.value = '建立失敗（可能使用者帳號已存在）'
            return
        }
    }

    emit('submit', {
        username: newUsername,
        display_name: form.value.display_name.trim(),
        email: form.value.email.trim(),
        passwordHash: form.value.passwordHash.trim(),
        department: selectedDept.value?.description || null,
        ou: selectedDept.value?.ou_dn || null,
        groupsname: selectedGroups.value.length > 0
            ? selectedGroups.value.map(g => g.groupname).join(',')
            : null,
        status: enabled.value ? 'active' : 'disabled',
    })
}
</script>

<style scoped>
/* 風格直接沿用你 OU modal 那套 */
.modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal-card {
    width: min(980px, 100%);
    background: rgba(15, 23, 42, .96);
    border: 1px solid rgba(148, 163, 184, .3);
    border-radius: 18px;
    /* overflow: hidden; */
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

/* 👈 新增：錯誤訊息樣式 */
.error-message {
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    font-size: 13px;
    border: 1px solid rgba(239, 68, 68, 0.3);
}

.row {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
}

.field {
    flex: 1 1 420px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    flex: 0 0 280px;
}

label {
    font-size: 14px;
    color: rgba(226, 232, 240, .9);
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

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 16px;
    border-top: 1px solid rgba(148, 163, 184, .2);
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

.btn:disabled {
    opacity: .55;
    cursor: default;
}

/* 可根據需要自訂 MultiSelect 樣式 */
.multiselect-input :deep(.multiselect) {
    border: 1px solid rgba(148, 163, 184, .55);
    border-radius: 999px;
    background: rgba(15, 23, 42, .85);
}

.multiselect-input :deep(.multiselect__input),
.multiselect-input :deep(.multiselect__single) {
    background: transparent;
    color: #ffffff !important;
    font-size: 14px;
}

.multiselect-input :deep(.multiselect__tags) {
    background: rgba(15, 23, 42, .85);
    border-radius: 999px;
}

.multiselect-input :deep(.multiselect__tag) {
    background: #a855f7;
    color: #ffffff !important;
    border-radius: 999px;
    padding: 3px 18px 3px 8px !important;
}

.multiselect-input :deep(.multiselect__option--highlight) {
    background: #a855f7;
    color: #ffffff !important;
}

.multiselect-input :deep(.multiselect__option--selected) {
    background: #a855f7;
    color: #ffffff !important;
}

.multiselect-input :deep(.multiselect__content-wrapper) {
    border-color: rgba(148, 163, 184, .55);
    background: rgba(15, 23, 42, .96);
}

.multiselect__content-wrapper {
    max-height: 500px;
    z-index: 1000;
}


.multiselect-input :deep(.multiselect__option) {
    color: #ffffff !important;
}
</style>
