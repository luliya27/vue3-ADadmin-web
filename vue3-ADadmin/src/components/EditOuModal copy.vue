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
            <input v-model.trim="ouname" class="input" placeholder="例如：test1" />
          </div>
          <div class="field">
            <label>別名（部門）：</label>
            <input v-model.trim="description" class="input" placeholder="例如：資訊部" />
          </div>
        </div>

        <!-- 第二列：建立子層 OU / 子 OU 名稱 dropdown -->
        <div class="row">
          <div class="field checkbox">
            <label>建立子層 OU：</label>
            <input type="checkbox" v-model="enableChild" />
          </div>

          <div class="field" v-if="enableChild">
            <label>選擇子 OU 名稱：</label>
            <select v-model="childOuName" class="input">
              <option value="">請選擇子 OU</option>
              <option v-for="ou in childOuOptions" :key="ou.id" :value="ou.ouname">
                {{ ou.ouname }}
              </option>
            </select>
            <div class="help">
              子 OU 名稱讀取來源於資料表 ous 既有項目
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
const enableChild = ref(false)
const childOuName = ref('')
const errorMessage = ref('')

watch(
  () => props.ou,
  (v) => {
    ouname.value = v?.ouname || ''
    description.value = v?.description || ''
    enableChild.value = false
    childOuName.value = ''
  },
  { immediate: true }
)

// 动态计算 ou_dn：若修改了 ouname，则重新拼接
const computedOuDn = computed(() => {
  if (!props.ou) return ''

  // 如果没有修改 ouname，返回原 ou_dn
  if (ouname.value === props.ou.ouname) {
    return props.ou.ou_dn
  }

  // 如果修改了 ouname，基于 parent_dn 重新构建 ou_dn
  const newOuPart = `OU=${ouname.value}`

  if (!props.ou.parent_dn) {
    // 根 OU：parent_dn 为 null，则 ou_dn = OU=name,DC=corp,DC=example,DC=com
    return `OU=${ouname.value},DC=corp,DC=example,DC=com`
  }

  // 子 OU：ou_dn = OU=name,parent_dn
  return `${newOuPart},${props.ou.parent_dn}`
})

// 只取「root OU」（parent_dn 為 NULL）
const rootOuOptions = computed(() =>
  (props.ouOptions || []).filter(o => !o.parent_dn)
)

// 獲取當前 OU 的所有父層（遞推）
const getParentOuNames = computed(() => {
  const parentNames = new Set<string>()
  let current = props.ou

  // 遞推向上收集所有父層 OU 的 ouname
  while (current && current.parent_dn) {
    // 根據 parent_dn 找到父 OU
    const parent = (props.ouOptions || []).find(o => o.ou_dn === current.parent_dn)
    if (parent) {
      parentNames.add(parent.ouname)
      current = parent
    } else {
      break
    }
  }

  return parentNames
})

// 子 OU dropdown：排除自己 + 排除所有父層，只取 root OU
// 注意：當 ouname 變更時，需要使用新的 ouname 進行篩選
const childOuOptions = computed(() =>
  rootOuOptions.value.filter(o =>
    o.ouname !== ouname.value &&
    o.id !== props.ou.id &&
    !getParentOuNames.value.has(o.ouname)
  )
)

// 若取消勾選子層 OU，就清掉子 OU 選擇
watch(enableChild, (v) => {
  if (!v) childOuName.value = ''
})

const submit = () => {
  errorMessage.value = ''
  const newOuname = ouname.value.trim()
  const newDescription = description.value.trim()
  const newChildOuName = childOuName.value.trim()

  // 檢查 OU 名稱是否修改且重複
  if (newOuname !== props.ou.ouname && props.ous) {
    const isDuplicate = props.ous.some(o => o.ouname === newOuname)
    if (isDuplicate) {
      errorMessage.value = '建立失敗（可能 OU 名稱已存在）'
      return
    }
  }

  // 檢查子 OU 名稱是否重複（如果有新增子 OU）
  if (enableChild.value && newChildOuName && props.ous) {
    const childDuplicate = props.ous.some(o => o.ouname === newChildOuName)
    if (childDuplicate) {
      errorMessage.value = '建立失敗（可能 OU 名稱已存在）'
      return
    }
  }

  const payload: any = {
    description: newDescription,
  }
  
  // 若修改了 ouname，需要傳送新的 ouname 和 ou_dn
  if (newOuname !== props.ou.ouname) {
    payload.ouname = newOuname
    payload.ou_dn = computedOuDn.value
  }
  
  if (enableChild.value && newChildOuName) {
    payload.childOuName = newChildOuName
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