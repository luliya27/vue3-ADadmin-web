<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div class="title">建立組織單位</div>
        <button class="close" type="button" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <!-- 錯誤訊息提示 -->
        <div v-if="errorMessage" class="error-message">
          ⚠️ {{ errorMessage }}
        </div>
        <!-- 第一列：父 OU / OU 別名 -->
        <div class="row">
          <div class="field">
            <label>OU 名稱：</label>
            <!-- 父 OU 名稱（手動輸入） -->
            <input v-model.trim="parentOuName" class="input" placeholder="例如：HeadOffice" />

            <!-- 父 OU dropdown（來源：ous root） -->
            <!-- <select v-model="parentOuName" class="input">
              <option value="">請選擇父 OU</option>
              <option v-for="ou in rootOuOptions"
                :key="ou.id"
                :value="ou.ouname">
                {{ ou.ouname }}
              </option>
            </select> -->
          </div>

          <div class="field">
            <label>OU別名（部門）：</label>
            <input v-model.trim="description" class="input" placeholder="例如：資訊部" />
          </div>
        </div>

        <!-- 第二列：建立子層 / 子 OU dropdown -->
        <div class="row">
          <div class="field checkbox">
            <label>建立子層 OU：</label>
            <input type="checkbox" v-model="enableChild" />
          </div>

          <div class="field" v-if="enableChild">
            <label>選擇子 OU 名稱：</label>

            <!-- 子 OU dropdown（來源：ous root） -->
            <select v-model="childOuName" class="input">
              <option value="">請選擇子 OU</option>
              <option v-for="ou in childOuOptions" :key="ou.id" :value="ou.ouname">
                {{ ou.ouname }}
              </option>
            </select>

            <div class="help">
              子 OU 名稱讀取來源於資料表 ous 既有項目（root OU）
            </div>
          </div>
        </div>

        <!-- 第三列：OU_DN 預覽（readonly） -->
        <div class="row">
          <div class="field full">
            <label>OU_DN（自動產生）：</label>
            <input :value="ouDnPreview" class="input dark" readonly />
            <div v-if="!dcDn" class="warn">
              尚未設定 DC DN（請先到「系統設定」儲存網域）
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <!-- <button class="btn ghost" type="button" @click="$emit('close')">取消</button> -->
        <button class="btn primary" type="button" :disabled="!canSubmit" @click="submit">
          儲存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type OuOption = {
  id: number
  ou_dn: string
  ouname: string
  description?: string
  parent_dn?: string | null
  parentou: number
}

type OuItem = OuOption

const props = defineProps<{
  dcDn: string
  ouOptions: OuOption[]
  ous?: OuItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { parentOuName: string; childOuName?: string; description: string }): void
}>()

const parentOuName = ref('')
const childOuName = ref('')
const description = ref('')
const enableChild = ref(false)
const errorMessage = ref('')

const dcDn = computed(() => (props.dcDn || '').trim())

// 只取「root OU」（parent_dn 為 NULL 或 parentou 可視你資料而定）
// ✅ 你目前 DB root 是 parent_dn = NULL，這個最準
const rootOuOptions = computed(() =>
  (props.ouOptions || []).filter(o => !o.parent_dn)
)

// 子 OU dropdown：同樣來源於 root OU
// ✅ 也避免子 OU 跟父 OU 同名（可選）
const childOuOptions = computed(() =>
  rootOuOptions.value.filter(o => o.ouname !== parentOuName.value)
)

// 若取消勾選子層 OU，就清掉子 OU 選擇
watch(enableChild, (v) => {
  if (!v) childOuName.value = ''
})

// OU_DN 預覽（完全依照你需求規則）
const ouDnPreview = computed(() => {
  if (!dcDn.value) return ''

  const parent = parentOuName.value.trim()
  const child = childOuName.value.trim()

  if (!parent) return ''

  // 無子層：OU=HeadOffice,DC=corp,DC=example,DC=com
  if (!enableChild.value) {
    return `OU=${parent},${dcDn.value}`
  }

  // 有子層：OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com
  if (!child) return ''
  return `OU=${child},OU=${parent},${dcDn.value}`
})

const canSubmit = computed(() => {
  if (!dcDn.value) return false
  if (!parentOuName.value.trim()) return false
  if (enableChild.value && !childOuName.value.trim()) return false
  return true
})

const submit = () => {
  errorMessage.value = ''
  const parentName = parentOuName.value.trim()
  const childName = childOuName.value.trim()

  if (!dcDn.value) return
  if (!parentName) return
  if (enableChild.value && !childName) return

  // 檢查父 OU 名稱是否重複
  if (props.ous) {
    const parentDuplicate = props.ous.some(o => o.ouname === parentName)
    if (parentDuplicate) {
      errorMessage.value = '建立失敗（可能 OU 名稱已存在）'
      return
    }
  }

  // 檢查子 OU 名稱是否重複（如果有子 OU）
  if (enableChild.value && childName && props.ous) {
    const childDuplicate = props.ous.some(o => o.ouname === childName)
    if (childDuplicate) {
      errorMessage.value = '建立失敗（可能 OU 名稱已存在）'
      return
    }
  }

  const payload: any = {
    parentOuName: parentName,
    description: description.value.trim(),
  }
  if (enableChild.value) payload.childOuName = childName
  emit('submit', payload)
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
  z-index: 50;
}

.modal-card {
  width: min(980px, 100%);
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 18px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
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
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(2, 6, 23, 0.5);
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

.field.full {
  flex-basis: 100%;
}

.field.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  flex: 0 0 240px;
}

label {
  font-size: 14px;
  color: rgba(226, 232, 240, 0.9);
}

.input {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.55);
  background: rgba(15, 23, 42, 0.85);
  color: #e5e7eb;
  font-size: 14px;
  padding: 9px 14px;
  outline: none;
}

.input.dark {
  background: #020617;
}

.help {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.95);
}

.warn {
  margin-top: 8px;
  font-size: 12px;
  color: #fca5a5;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(2, 6, 23, 0.5);
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
  opacity: 0.55;
  cursor: default;
}
</style>
