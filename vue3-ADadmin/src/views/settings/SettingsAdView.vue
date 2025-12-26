<template>
    <div class="settings-page">
        <section class="section">
            <h2 class="section-title">AD 管理後台 - 使用設定</h2>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label">自訂公司名稱：</label>
                    <input v-model.trim="form.companyname" type="text" class="field-input"
                        placeholder="例如：ABC 股份有限公司" />
                </div>

                <div class="field-row">
                    <label class="field-label">自訂部門單位名稱：</label>
                    <input v-model.trim="form.teamname" type="text" class="field-input" placeholder="例如：資訊部" />
                </div>
            </div>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label">系統 LOGO：</label>
                    <div class="field-with-button">
                        <input v-model.trim="form.syslogo" type="text" class="field-input" />
                        <button class="upload-btn" type="button" @click="onUpload('syslogo')">
                            上傳圖檔
                        </button>
                    </div>

                    <div v-if="form.syslogo" class="preview">
                        <img :src="form.syslogo" alt="logo preview">
                    </div>
                </div>

                <div class="field-row">
                    <label class="field-label">系統背景圖：</label>
                    <div class="field-with-button">
                        <input v-model.trim="form.sysbackgroundimg" type="text" class="field-input" />
                        <button class="upload-btn" type="button" @click="onUpload('sysbackgroundimg')">
                            上傳圖檔
                        </button>
                    </div>

                    <div v-if="form.sysbackgroundimg" class="preview">
                        <img :src="form.sysbackgroundimg" alt="bg preview">
                    </div>
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">最高權限登入設定</h2>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>自訂系統帳號：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.sysaccount" type="text" class="field-input"
                            :class="{ 'field-error': errors.sysaccount }" placeholder="例如：admin"
                            @blur="validateField('sysaccount')" />
                        <span v-if="errors.sysaccount" class="error-message">{{ errors.sysaccount }}</span>
                    </div>
                </div>

                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>自訂系統密碼：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.syspasswd" type="password" class="field-input"
                            :class="{ 'field-error': errors.syspasswd }" placeholder="輸入密碼"
                            @blur="validateField('syspasswd')" />
                        <span v-if="errors.syspasswd" class="error-message">{{ errors.syspasswd }}</span>
                    </div>
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">網域中的 DC 設定</h2>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>網域名稱：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.domainname" type="text" class="field-input"
                            :class="{ 'field-error': errors.domainname }" placeholder="例如：example.com"
                            @blur="validateField('domainname')" />
                        <span v-if="errors.domainname" class="error-message">{{ errors.domainname }}</span>
                    </div>
                </div>

                <div class="field-row">
                    <label class="field-label">DN 識別名稱：</label>
                    <input v-model="form.dc_dn" type="text" class="field-input field-input--dark"
                        placeholder="例如：DC=example,DC=com" readonly />
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">網路連線設定</h2>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>IP 位置：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.ip" type="text" class="field-input"
                            :class="{ 'field-error': errors.ip }" placeholder="例如：192.168.1.1"
                            @blur="validateField('ip')" />
                        <span v-if="errors.ip" class="error-message">{{ errors.ip }}</span>
                    </div>
                </div>

                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>子網路遮罩：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.subnetmask" type="text" class="field-input"
                            :class="{ 'field-error': errors.subnetmask }" placeholder="例如：255.255.255.0"
                            @blur="validateField('subnetmask')" />
                        <span v-if="errors.subnetmask" class="error-message">{{ errors.subnetmask }}</span>
                    </div>
                </div>

                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>預設閘道：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.defaultgateway" type="text" class="field-input"
                            :class="{ 'field-error': errors.defaultgateway }" placeholder="例如：192.168.1.254"
                            @blur="validateField('defaultgateway')" />
                        <span v-if="errors.defaultgateway" class="error-message">{{ errors.defaultgateway }}</span>
                    </div>
                </div>
            </div>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>慣用 DNS：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.preferredDNSserver" type="text" class="field-input"
                            :class="{ 'field-error': errors.preferredDNSserver }" placeholder="例如：8.8.8.8"
                            @blur="validateField('preferredDNSserver')" />
                        <span v-if="errors.preferredDNSserver" class="error-message">{{ errors.preferredDNSserver
                            }}</span>
                    </div>
                </div>

                <div class="field-row">
                    <label class="field-label"><span class="required">*</span>其他 DNS：</label>
                    <div class="field-wrapper">
                        <input v-model.trim="form.secondaryDNSserver" type="text" class="field-input"
                            :class="{ 'field-error': errors.secondaryDNSserver }" placeholder="例如：8.8.4.4"
                            @blur="validateField('secondaryDNSserver')" />
                        <span v-if="errors.secondaryDNSserver" class="error-message">{{ errors.secondaryDNSserver
                            }}</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- 底部狀態 -->
        <div class="footer-btn">
            <span v-if="message" :class="['message', messageType]">
                {{ message }}
            </span>
            <button class="btn primary" type="button" :disabled="saving || loading" @click="onSave">
                {{ saving ? '儲存中…' : '儲存' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import type { AdSettings } from '@/services/adadmin'
import { fetchAdSettings, updateAdSettings } from '@/services/adadmin'
import { uploadFile } from '@/services/adadmin'
import { useAdSettingsStore } from '@/stores/adSettings'

const adSettingsStore = useAdSettingsStore()
const uploading = ref(false);

// 上傳檔案處理函式
const onUpload = async (field: 'syslogo' | 'sysbackgroundimg') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'

    input.onchange = async () => {
        if (!input.files?.length) return

        const file = input.files[0]
        if (!file) return // TypeScript 類型守衛

        uploading.value = true
        message.value = ''

        try {
            const url = await uploadFile(file, field)

            // ✅ 更新本地表單，用於預覽
            form[field] = url

            // ✅ 自動儲存到資料庫並更新全局 store
            await updateAdSettings({ ...form })
            adSettingsStore.setSettings({ ...(form as any) })

            message.value = '圖片已上傳並儲存'
            messageType.value = 'success'
        } catch (err) {
            console.error(err)
            message.value = '上傳或儲存失敗'
            messageType.value = 'error'
        } finally {
            uploading.value = false
        }
    }

    input.click()
}

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

// 錯誤訊息
const errors = reactive<Record<string, string>>({
    sysaccount: '',
    syspasswd: '',
    domainname: '',
    ip: '',
    subnetmask: '',
    defaultgateway: '',
    preferredDNSserver: '',
    secondaryDNSserver: ''
})

// 表單資料
const form = reactive<AdSettings>({
    id: 0,
    companyname: '',
    teamname: '',
    syslogo: '',
    sysbackgroundimg: '',
    sysaccount: '',
    syspasswd: '',
    domainname: '',
    dc_dn: '',
    ip: '',
    subnetmask: '',
    defaultgateway: '',
    preferredDNSserver: '',
    secondaryDNSserver: '',
})

// 驗證 IP 格式 (xxx.xxx.xxx.xxx 或 x.x.x.x)
const validateIpFormat = (value: string): boolean => {
    const parts = value.split('.')
    if (parts.length !== 4) return false

    return parts.every(part => {
        // 每段最多3個字元
        if (part.length === 0 || part.length > 3) return false
        // 每段必須是數字
        return /^\d+$/.test(part)
    })
}

// 驗證單一欄位
const validateField = (field: string) => {
    const value = form[field as keyof AdSettings] as string
    const fieldNames: Record<string, string> = {
        sysaccount: '系統帳號',
        syspasswd: '系統密碼',
        domainname: '網域名稱',
        ip: 'IP 位置',
        subnetmask: '子網路遮罩',
        defaultgateway: '預設閘道',
        preferredDNSserver: '慣用 DNS',
        secondaryDNSserver: '其他 DNS'
    }

    // 檢查是否為空
    if (!value || value.trim() === '') {
        errors[field] = `${fieldNames[field]}不可為空`
        return false
    }

    // IP 格式驗證
    const ipFields = ['ip', 'subnetmask', 'defaultgateway', 'preferredDNSserver', 'secondaryDNSserver']
    if (ipFields.includes(field)) {
        if (!validateIpFormat(value)) {
            errors[field] = `${fieldNames[field]}格式錯誤，請輸入如 192.168.1.1 格式`
            return false
        }
    }

    errors[field] = ''
    return true
}

// 驗證所有必填欄位
const validateAllRequired = (): boolean => {
    const requiredFields = [
        'sysaccount',
        'syspasswd',
        'domainname',
        'ip',
        'subnetmask',
        'defaultgateway',
        'preferredDNSserver',
        'secondaryDNSserver'
    ]

    let isValid = true
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false
        }
    })

    return isValid
}

// 將網域名稱轉成 DN，例如 corp.example.com -> DC=corp,DC=example,DC=com
const domainToDn = (domain: string): string => {
    const parts = (domain || '')
        .trim()
        .split('.')
        .map((p) => p.trim())
        .filter(Boolean)

    if (parts.length === 0) return ''
    return parts.map((p) => `DC=${p}`).join(',')
}

// DN 識別名稱自動由 domainname 派生
watch(
    () => form.domainname,
    (val) => {
        form.dc_dn = domainToDn(val)
    },
    { immediate: true }
)

// 載入設定
const loadSettings = async () => {
    loading.value = true
    message.value = ''
    try {
        const data = await fetchAdSettings()
        Object.assign(form, data)
        // lastAutoDcDn.value = domainToDn(form.domainname) // 移除
    } catch (err) {
        console.error(err)
        message.value = '載入系統設定失敗'
        messageType.value = 'error'
    } finally {
        loading.value = false
    }
}

// 儲存設定
const onSave = async () => {
    // 驗證必填欄位
    if (!validateAllRequired()) {
        message.value = '請填寫所有必填欄位'
        messageType.value = 'error'
        return
    }

    saving.value = true
    message.value = ''
    try {
        await updateAdSettings({ ...form })
        adSettingsStore.setSettings({ ...(form as any) }) // 同步到全局
        message.value = '儲存成功'
        messageType.value = 'success'
    } catch (err) {
        console.error(err)
        message.value = '儲存失敗'
        messageType.value = 'error'
    } finally {
        saving.value = false
    }
}

onMounted(() => {
    adSettingsStore.init() // store 初始化 (初始化 Pinia 狀態)
    loadSettings()
})
</script>

<style scoped>
/* 區塊 */
.section {
    border-bottom: 1px solid rgba(148, 163, 184, 0.3);
    padding: 12px 0 15px;
}

.section-title {
    margin: 0 0 12px;
    font-size: 18px;
}

.section-body {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 40px;
    /* width: 70%; */
    padding: 10px 10px 10px 10px;
}

/* 欄位 */
.field-row {
    display: flex;
    align-items: flex-start;
    min-width: 430px;
    /* flex: 1 1 360px; */
}

.field-label {
    /* width: 140px; */
    font-size: 14px;
    padding-right: 10px;
    padding-top: 6px;
}

.required {
    color: #ef4444;
    margin-right: 2px;
}

.field-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.field-input {
    flex: 1;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.7);
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
    font-size: 13px;
    padding: 6px 12px;
}

.field-input--dark {
    background: #000000;
}

.field-input:focus {
    outline: none;
    border-color: #6366f1;
}

.field-input.field-error {
    border-color: #ef4444;
}

.error-message {
    color: #fca5a5;
    font-size: 12px;
    padding-left: 4px;
}

.field-with-button {
    display: flex;
    gap: 8px;
    flex: 1;
}

.upload-btn {
    padding: 6px 14px;
    border-radius: 999px;
    border: none;
    background: #a855f7;
    color: #f9fafb;
    font-size: 13px;
    cursor: pointer;
}

.upload-btn:hover {
    filter: brightness(1.05);
}

/* 底部儲存列 */
.footer-btn {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-top: 15px;
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

.btn.primary:disabled {
    opacity: 0.6;
    cursor: default;
}

.message {
    font-size: 13px;
    padding-right: 10px;
}

.message.success {
    color: #a5b4fc;
}

.message.error {
    color: #fca5a5;
}

/* 預覽 */
.preview {
    margin-top: 8px;
}

.preview img {
    max-height: 80px;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    margin-left: 10px;
}
</style>
