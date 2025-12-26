<template>
    <div class="modal-mask" @click.self="$emit('close')">
        <div class="modal-card">
            <div class="modal-header">
                <div class="title">使用者詳細資訊</div>
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
                        <input v-model.trim="form.username" class="input" />
                    </div>
                    <div class="field">
                        <label>顯示名稱：</label>
                        <input v-model.trim="form.display_name" class="input" />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>Email：</label>
                        <input v-model.trim="form.email" class="input" />
                    </div>
                    <div class="field">
                        <label>密碼：</label>
                        <input v-model.trim="form.passwordHash" class="input" placeholder="不改可留空（看你後端規則）" />
                    </div>
                </div>

                <div class="row">
                    <div class="field">
                        <label>部門：</label>
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
                        <Multiselect v-model="selectedGroups" :options="groups" :searchable="true" :allow-empty="true"
                            :multiple="true" placeholder="選擇群組" label="groupname" track-by="groupname"
                            class="multiselect-input" />
                    </div>

                    <div class="field">
                        <label>狀態：</label>
                        <div class="status-row">
                            <select v-model="status" class="input">
                                <option value="active">啟用中</option>
                                <option value="locked">鎖定中</option>
                                <option value="disabled">停用中</option>
                            </select>

                            <button v-if="status === 'locked'" class="btn mini green" type="button"
                                @click="$emit('unlock')">
                                解鎖
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer between">
                <button class="btn danger" type="button" @click="$emit('delete')">刪除</button>
                <div class="right">
                    <!-- <button class="btn ghost" type="button" @click="$emit('close')">取消</button> -->
                    <button class="btn primary" type="button" @click="submit">儲存</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Multiselect from 'vue-multiselect' // 引入 Multiselect 元件
import 'vue-multiselect/dist/vue-multiselect.css' // 引入 Multiselect 樣式
import type { OuItem, GroupItem, User } from '@/services/adadmin'

const props = defineProps<{
    user: User
    ous: OuItem[]
    groups: GroupItem[]
    users?: User[] // 👈 新增：所有使用者清單，用於檢查帳號重複
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'submit', payload: any): void
    (e: 'delete'): void
    (e: 'unlock'): void
}>()

const form = ref({
    username: props.user.username,
    display_name: props.user.display_name,
    email: props.user.email,
    passwordHash: '', // 修改時可選填
})

const departmentOptions = computed(() => {
    return props.ous
})

const selectedDept = ref<OuItem | null>(null)
const selectedGroups = ref<GroupItem[]>([])
const status = ref<User['status']>(props.user.status)
const errorMessage = ref('') // 👈 新增：錯誤訊息

const ouDnPreview = computed(() => selectedDept.value?.ou_dn || '')

watch(() => props.user, (u) => {
    form.value.username = u.username
    form.value.display_name = u.display_name
    form.value.email = u.email
    form.value.passwordHash = ''

    // 設定選中的部門（OU）
    // 先嘗試用 ou_dn（DN） 比對，若無則用 ouname 比對
    if (u.ou_dn) {
        selectedDept.value = props.ous.find(o => o.ou_dn === u.ou_dn) || null
    } else if (u.ouname) {
        selectedDept.value = props.ous.find(o => o.ouname === u.ouname) || null
    } else {
        selectedDept.value = null
    }

    // 設定選中的群組
    const groupNames = (u.groupsname || '').split(',').map(g => g.trim()).filter(g => g.length > 0)
    selectedGroups.value = props.groups.filter(g => groupNames.includes(g.groupname))

    status.value = u.status
}, { immediate: true, deep: true })

// 提交修改
const submit = () => {
    errorMessage.value = '' // 清空錯誤訊息
    
    const newUsername = form.value.username.trim()
    const hasUsernameChanged = newUsername !== props.user.username
    
    // ✅ 檢查帳號是否重複（如果帳號有改變）
    if (hasUsernameChanged && props.users) {
        const isDuplicate = props.users.some(u => u.username === newUsername)
        if (isDuplicate) {
            errorMessage.value = '建立失敗（可能使用者帳號已存在）'
            return
        }
    }
    
    const payload: any = {
        id: props.user.id,
        username: newUsername,
        display_name: form.value.display_name.trim(),
        email: form.value.email.trim(),
        department: selectedDept.value?.description || null,
        ou: selectedDept.value?.ou_dn || null,
        groupsname: selectedGroups.value.length > 0
            ? selectedGroups.value.map(g => g.groupname).join(',')
            : null,
        status: status.value,
    }
    if (form.value.passwordHash.trim()) payload.passwordHash = form.value.passwordHash.trim()
    emit('submit', payload) // 發出 submit 事件，帶上修改資料
}
</script>

<style scoped>
/* 同 Create modal */
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

.status-row {
    display: flex;
    align-items: center;
    gap: 10px;
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
    gap: 10px;
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
    border: none;
    background: #ef4444;
    color: #fff;
}

.btn.mini {
    height: 34px;
    padding: 0 14px;
}

.btn.green {
    border: none;
    background: #22c55e;
    color: #ffffff;
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
