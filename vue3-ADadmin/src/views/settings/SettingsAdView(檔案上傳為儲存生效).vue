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
                    <label class="field-label">自訂系統帳號：</label>
                    <input v-model.trim="form.sysaccount" type="text" class="field-input" placeholder="例如：admin" />
                </div>

                <div class="field-row">
                    <label class="field-label">自訂系統密碼：</label>
                    <input v-model.trim="form.syspasswd" type="password" class="field-input"
                        placeholder="輸入密碼" />
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">網域中的 DC 設定</h2>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label">網域名稱：</label>
                    <input v-model.trim="form.domainname" type="text" class="field-input" placeholder="例如：example.com" />
                </div>

                <div class="field-row">
                    <label class="field-label">DN 識別名稱：</label>
                    <input v-model.trim="form.dc_dn" type="text" class="field-input field-input--dark"
                        placeholder="例如：DC=example,DC=com" />
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">網路連線設定</h2>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label">IP 位置：</label>
                    <input v-model.trim="form.ip" type="text" class="field-input" placeholder="例如：192.168.1.1" />
                </div>

                <div class="field-row">
                    <label class="field-label">子網路遮罩：</label>
                    <input v-model.trim="form.subnetmask" type="text" class="field-input" placeholder="例如：255.255.255.0" />
                </div>

                <div class="field-row">
                    <label class="field-label">預設閘道：</label>
                    <input v-model.trim="form.defaultgateway" type="text" class="field-input"
                        placeholder="例如：192.168.1.254" />
                </div>
            </div>
            <div class="section-body">
                <div class="field-row">
                    <label class="field-label">慣用 DNS：</label>
                    <input v-model.trim="form.preferredDNSserver" type="text" class="field-input"
                        placeholder="例如：8.8.8.8" />
                </div>

                <div class="field-row">
                    <label class="field-label">其他 DNS：</label>
                    <input v-model.trim="form.secondaryDNSserver" type="text" class="field-input"
                        placeholder="例如：8.8.4.4" />
                </div>
            </div>
        </section>

        <!-- 底部狀態 -->
        <div class="footer">
            <span v-if="message" :class="['message', messageType]">
                {{ message }}
            </span>
            <button class="save-btn" type="button" :disabled="saving || loading" @click="onSave">
                {{ saving ? '儲存中…' : '儲存' }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { AdSettings } from '@/services/adadmin'
import { fetchAdSettings, updateAdSettings } from '@/services/adadmin'
import { uploadFile } from '@/services/adadmin'
import { useAdSettingsStore } from '@/stores/adSettings'

const adSettingsStore = useAdSettingsStore()
const uploading = ref(false);

// 上傳檔案處理函式
const onUpload = async (field: 'syslogo' | 'sysbackgroundimg') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
        if (!input.files?.length) return;

        const file = input.files[0];
        uploading.value = true;
        message.value = '';

        try {
            const url = await uploadFile(file, field);
            form[field] = url;  // 更新顯示圖 URL
            message.value = '上傳成功';
            messageType.value = 'success';
        } catch (err) {
            console.error(err);
            message.value = '上傳失敗';
            messageType.value = 'error';
        } finally {
            uploading.value = false;
        }
    };

    input.click();
};

const loading = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

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

// 載入設定
const loadSettings = async () => {
    loading.value = true
    message.value = ''
    try {
        const data = await fetchAdSettings()
        Object.assign(form, data)
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
.settings-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-bottom: 60px;
}

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
    align-items: center;
    min-width: 360px;
    flex: 1 1 360px;
}

.field-label {
    /* width: 140px; */
    font-size: 14px;
    padding-right: 10px;
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
    background: #020617;
}

.field-input:focus {
    outline: none;
    border-color: #6366f1;
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
.footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-top: -5px;
}

.save-btn {
    padding: 8px 26px;
    border-radius: 999px;
    border: none;
    background: #a855f7;
    color: #f9fafb;
    font-size: 14px;
    cursor: pointer;
}

.save-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

.message {
    font-size: 13px;
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
}
</style>
