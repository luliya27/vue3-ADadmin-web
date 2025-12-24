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
        <!-- 第一列：OU 名稱 / 別名（部門） -->
        <div class="row">
          <div class="field">
            <label>OU 名稱：</label>
            <input v-model.trim="ouname" class="input" placeholder="例如：HeadOffice" />
          </div>
          <div class="field">
            <label>別名（部門）：</label>
            <input v-model.trim="description" class="input" placeholder="例如：資訊部" />
          </div>
        </div>

        <!-- 第二列：OU 層級選擇（Radio） -->
        <div class="row">
          <div class="field">
            <label>OU 層級：</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="ouHierarchy" value="root" />
                <span>無子層 OU</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="ouHierarchy" value="child" />
                <span>設為子層 OU</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 第二點五列：選擇父 OU（當選擇設為子層時顯示） -->
        <div class="row" v-if="ouHierarchy === 'child'">
          <div class="field">
            <label>選擇父層 OU：</label>
            <select v-model="selectedParentOu" class="input">
              <option value="">請選擇父層 OU</option>
              <option v-for="ou in parentOuOptions" :key="ou.id" :value="ou.id">
                {{ ou.ouname }}
              </option>
            </select>
            <div class="help">
              選擇此 OU 的父層 OU
            </div>
          </div>
        </div>

        <!-- 第三列：OU_DN（readonly） -->
        <div class="row">
          <div class="field full">
            <label>OU_DN：</label>
            <input :value="computedOuDn" class="input dark" readonly />
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
  (e: 'submit', payload: { ouname: string; description: string; parent_dn?: string | null; parent_id?: number | null; parentou?: number }): void
}>()

const ouname = ref('')
const description = ref('')
const ouHierarchy = ref<'root' | 'child'>('root') // radio 選擇：root 或 child
const selectedParentOu = ref<number | ''>('')
const errorMessage = ref('')

const dcDn = computed(() => (props.dcDn || '').trim())

// 只取「root OU」（parent_dn 為 NULL）
const rootOuOptions = computed(() =>
  (props.ouOptions || []).filter(o => !o.parent_dn)
)

// 可作為父 OU 的選項：所有 root OU
const parentOuOptions = computed(() => rootOuOptions.value)

// 若切換回「無子層 OU」，清空父層選擇
watch(ouHierarchy, (v) => {
  if (v === 'root') {
    selectedParentOu.value = ''
  }
})

// 動態計算 ou_dn：根據 hierarchy 選擇和父 OU 自動更新
const computedOuDn = computed(() => {
  const ouDisplayName = ouname.value.trim()
  if (!ouDisplayName) return ''
  if (!dcDn.value) return ''

  // 如果選擇無子層 OU（root OU）
  if (ouHierarchy.value === 'root') {
    return `OU=${ouDisplayName},${dcDn.value}`
  }

  // 如果選擇設為子層 OU，根據選中的父 OU 的 ou_dn 計算
  if (ouHierarchy.value === 'child') {
    if (selectedParentOu.value) {
      const parentOu = (props.ouOptions || []).find(o => o.id === selectedParentOu.value)
      if (parentOu) {
        // 使用父 OU 的完整 ou_dn：OU=childName,<parent_ou_dn>
        return `OU=${ouDisplayName},${parentOu.ou_dn}`
      }
    }
    // 如果還未選擇父 OU，暫時顯示預設格式
    return `OU=${ouDisplayName},${dcDn.value}`
  }

  return `OU=${ouDisplayName},${dcDn.value}`
})

const canSubmit = computed(() => {
  if (!dcDn.value) return false
  if (!ouname.value.trim()) return false
  if (ouHierarchy.value === 'child' && !selectedParentOu.value) return false
  return true
})

const submit = () => {
  errorMessage.value = ''
  const name = ouname.value.trim()

  if (!dcDn.value) return
  if (!name) return
  if (ouHierarchy.value === 'child' && !selectedParentOu.value) {
    errorMessage.value = '選擇設為子層 OU 時，必須選擇父層 OU'
    return
  }

  // 檢查 OU 名稱是否重複
  if (props.ous) {
    const duplicate = props.ous.some(o => o.ouname === name)
    if (duplicate) {
      errorMessage.value = '建立失敗（OU 名稱已存在）'
      return
    }
  }

  const payload: any = {
    ouname: name,
    description: description.value.trim(),
  }

  // 根據 hierarchy 設定 parent_dn、parent_id、parentou
  if (ouHierarchy.value === 'root') {
    // 無子層 OU（Root OU）：parent_dn = null, parent_id = null, parentou = 0
    payload.parent_dn = null
    payload.parent_id = null
    payload.parentou = 0
  } else if (ouHierarchy.value === 'child' && selectedParentOu.value) {
    // 設為子層 OU：設定 parent_dn、parent_id、parentou
    const parentOu = (props.ouOptions || []).find(o => o.id === selectedParentOu.value)
    if (parentOu) {
      payload.parent_dn = parentOu.ou_dn
      payload.parent_id = parentOu.id
      payload.parentou = 1
    }
  }

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
  width: min(860px, 100%);
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
  font-size: 16px;
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

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(226, 232, 240, 0.9);
}

.radio-option input[type="radio"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #a855f7;
}

.radio-option span {
  user-select: none;
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

.help {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
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
