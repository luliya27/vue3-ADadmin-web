<template>
  <div class="modal-mask" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div class="title">修改組織單位</div>
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
            <label>OU名稱：</label>
            <input v-model.trim="ouname" class="input dark" readonly />
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

type OuItem = {
  id: number
  ou_dn: string
  ouname: string
  description?: string
  parent_dn?: string | null
  parentou?: number
}

const props = defineProps<{
  ou: OuItem
  ouOptions?: OuItem[]
  ous?: OuItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { description: string; ouname?: string; ou_dn?: string; childOuName?: string }): void
  (e: 'delete'): void
}>()

const ouname = ref('')
const description = ref('')
const ouHierarchy = ref<'root' | 'child'>('root') // radio 選擇：root 或 child
const selectedParentOu = ref<number | ''>('')
const errorMessage = ref('')

watch(
  () => props.ou,
  (v) => {
    ouname.value = v?.ouname || ''
    description.value = v?.description || ''
    // 根據 parentou 設定初始 hierarchy
    ouHierarchy.value = v?.parentou === 1 ? 'child' : 'root'
    selectedParentOu.value = v?.parentou === 1 ? (v?.parent_dn ? getParentOuIdByDn(v.parent_dn) : '') : ''
    errorMessage.value = ''
  },
  { immediate: true }
)

// 根據 parent_dn 查找父 OU 的 ID
const getParentOuIdByDn = (parentDn: string): number | '' => {
  const parent = (props.ouOptions || []).find(o => o.ou_dn === parentDn)
  return parent ? parent.id : ''
}

// 動態計算 ou_dn：根據 hierarchy 選擇和父 OU 自動更新
const computedOuDn = computed(() => {
  if (!props.ou) return ''

  const ouDisplayName = ouname.value || props.ou.ouname

  // 如果選擇無子層 OU（root OU）
  if (ouHierarchy.value === 'root') {
    return `OU=${ouDisplayName},DC=corp,DC=example,DC=com`
  }

  // 如果選擇設為子層 OU，根據選中的父 OU 計算
  if (ouHierarchy.value === 'child') {
    if (selectedParentOu.value) {
      const parentOu = (props.ouOptions || []).find(o => o.id === selectedParentOu.value)
      if (parentOu) {
        return `OU=${ouDisplayName},OU=${parentOu.ouname},DC=corp,DC=example,DC=com`
      }
    }
    // 如果還未選擇父 OU，暫時顯示預設格式
    return `OU=${ouDisplayName},DC=corp,DC=example,DC=com`
  }

  return `OU=${ouDisplayName},DC=corp,DC=example,DC=com`
})

// 只取「root OU」（parent_dn 為 NULL），但要排除自己
const rootOuOptions = computed(() =>
  (props.ouOptions || []).filter(o => !o.parent_dn && o.id !== props.ou.id)
)

// 可作為父 OU 的選項：只取 root OU，排除自己和所有子孫 OU
const parentOuOptions = computed(() => {
  const childOuDns = new Set<string>()
  
  // 遞推收集所有子孫 OU 的 ou_dn
  const collectAllDescendants = (ou: OuItem) => {
    (props.ouOptions || []).forEach(o => {
      if (o.parent_dn === ou.ou_dn) {
        childOuDns.add(o.ou_dn)
        // 遞推收集子孫的子孫
        collectAllDescendants(o)
      }
    })
  }
  
  // 先收集當前 OU 的所有子孫
  collectAllDescendants(props.ou)
  
  // 返回 root OU，排除：1. 自己，2. 自己的所有子孫
  return rootOuOptions.value.filter(o => 
    o.id !== props.ou.id && !childOuDns.has(o.ou_dn)
  )
})

const submit = () => {
  errorMessage.value = ''
  const newDescription = description.value.trim()

  // 若選擇 child OU，必須選擇父層 OU
  if (ouHierarchy.value === 'child' && !selectedParentOu.value) {
    errorMessage.value = '選擇設為子層 OU 時，必須選擇父層 OU'
    return
  }

  const payload: any = {
    description: newDescription,
  }

  // 根據 hierarchy 設定 ou_dn、parent_dn、parentou
  if (ouHierarchy.value === 'root') {
    // Root OU：parent_dn = null, parentou = 0
    payload.ou_dn = computedOuDn.value
    // 若原本是 child，改回 root
    if (props.ou.parentou === 1) {
      payload.parent_dn = null
      payload.parentou = 0
    }
  } else if (ouHierarchy.value === 'child' && selectedParentOu.value) {
    // Child OU：設定 parent_dn、parentou、ou_dn
    const parentOu = (props.ouOptions || []).find(o => o.id === selectedParentOu.value)
    if (parentOu) {
      payload.parent_dn = parentOu.ou_dn
      payload.parentou = 1
      payload.ou_dn = computedOuDn.value
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
  padding: 14px 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.modal-footer.between {
  justify-content: space-between;
  align-items: center;
}

.right {
  display: flex;
  gap: 10px;
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

.btn.danger {
  border: none;
  background: rgba(239, 68, 68, 0.95);
  color: #fff;
}

.btn:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>