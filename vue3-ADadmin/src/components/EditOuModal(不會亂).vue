<template>
  <div v-if="modelValue" class="modal-mask" @click.self="close">
    <div class="modal-card">
      <button class="modal-close" @click="close">×</button>

      <h2 class="modal-title">修改組織單位</h2>
      <div class="modal-divider"></div>

      <!-- Row 1 -->
      <div class="form-grid">
        <div class="form-item">
          <label>OU名稱：</label>
          <input
            v-model.trim="form.ouname"
            class="input"
            :disabled="!allowEditOuName"
            placeholder="例如：IT"
          />
          <div v-if="!allowEditOuName" class="hint">
            OU 名稱通常不建議修改（會影響 OU_DN）
          </div>
        </div>

        <div class="form-item">
          <label>OU別名：(部門)</label>
          <input
            v-model.trim="form.description"
            class="input"
            placeholder="例如：資訊部"
          />
        </div>

        <!-- Row 2 -->
        <div class="form-item">
          <label>OU層級：</label>
          <div class="radio-group">
            <label class="radio">
              <input type="radio" value="root" v-model="form.level" />
              <span>無子層OU</span>
            </label>
            <label class="radio">
              <input type="radio" value="child" v-model="form.level" />
              <span>設為子層OU</span>
            </label>
          </div>
        </div>

        <div class="form-item" v-if="form.level === 'child'">
          <label>選擇父層 OU：</label>
          <select v-model="form.parentId" class="select">
            <option value="" disabled>請選擇父層 OU</option>
            <option
              v-for="p in parentCandidates"
              :key="p.id"
              :value="String(p.id)"
            >
              {{ p.ouname }}（{{ p.description || '未命名' }}）
            </option>
          </select>
          <div v-if="parentLockReason" class="hint warn">{{ parentLockReason }}</div>
        </div>

        <!-- Row 3 -->
        <div class="form-item full">
          <label>OU_DN：(自動產生)</label>
          <input class="input dn" :value="dnPreview" disabled />
        </div>
      </div>

      <div class="modal-divider"></div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn danger" @click="openDeleteConfirm">刪除</button>
        <div class="actions-right">
          <button class="btn ghost" @click="close">取消</button>
          <button class="btn primary" :disabled="!canSave" @click="onSave">
            儲存
          </button>
        </div>
      </div>

      <!-- Delete Confirm -->
      <div v-if="confirmDelete" class="confirm-mask">
        <div class="confirm-card">
          <div class="confirm-icon">!</div>
          <div class="confirm-text">確定將組織單位刪除？</div>
          <div class="confirm-actions">
            <button class="btn green" @click="confirmDelete = false">取消</button>
            <button class="btn danger" @click="onDelete">刪除</button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { updateOu, deleteOu, type Ou } from '@/services/adadmin'

/**
 * ✅ Props 設計（不會亂）
 * - modelValue: 控制開關
 * - ou: 目前要編輯的 OU
 * - ous: 全部 OU 清單（用來做父層 dropdown）
 * - dcDn: 系統設定的 dc_dn（用來顯示 dnPreview；如果你不想在前端算，也可不傳，dnPreview 就顯示原本 ou_dn）
 * - allowEditOuName: 預設 false（避免改名造成 DN 大變）
 */
const props = defineProps<{
  modelValue: boolean
  ou: Ou | null
  ous: Ou[]
  dcDn?: string
  allowEditOuName?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved', payload: { id: number | string }): void
  (e: 'deleted', payload: { id: number | string }): void
}>()

/** ✅ state：只存「使用者可改」的欄位 */
type Level = 'root' | 'child'
const form = reactive({
  id: '' as string | number,
  ouname: '',
  description: '',
  level: 'root' as Level,
  parentId: '' as string, // dropdown value（字串）
})

/** UI state */
const confirmDelete = ref(false)
const errorMsg = ref('')

/** ✅ 可選：是否允許改 OU 名稱 */
const allowEditOuName = computed(() => props.allowEditOuName === true)

/** ✅ computed：目前選到的父 OU（整筆） */
const selectedParent = computed(() => {
  if (!form.parentId) return null
  const idNum = Number(form.parentId)
  return props.ous.find(o => Number(o.id) === idNum) || null
})

/** ✅ computed：父 OU 的 DN（送後端用） */
const parentDn = computed<string | null>(() => {
  if (form.level !== 'child') return null
  return selectedParent.value?.ou_dn ?? null
})

/**
 * ✅ computed：父層候選清單
 * - 先排除自己（至少避免最基本循環）
 * - 若你之後要防「選自己的子孫」，可以在父層列表也額外過濾（需樹結構或後端驗證）
 */
const parentCandidates = computed(() => {
  const selfId = Number(form.id)
  return (props.ous || [])
    .filter(o => Number(o.id) !== selfId)
    .sort((a, b) => String(a.ouname).localeCompare(String(b.ouname)))
})

/** ✅ computed：父層 dropdown 的鎖定提示（必要時） */
const parentLockReason = computed(() => {
  if (form.level !== 'child') return ''
  if (!props.ous?.length) return '尚無可選父層 OU'
  return ''
})

/**
 * ✅ computed：OU_DN 預覽（readonly）
 * 建議用「OU=self + parent.ou_dn」來預覽，能支援多層
 * - root: OU=self,dcDn
 * - child: OU=self,parent.ou_dn
 *
 * 若你不想在前端算 DN：可以直接 return props.ou?.ou_dn
 * 但你需求是「設定父層 OU後，OU_DN同步更新」→ 建議保留這段
 */
const dnPreview = computed(() => {
  const name = (form.ouname || '').trim()
  if (!name) return ''

  if (form.level === 'child') {
    if (!parentDn.value) return ''
    // child DN = OU=self + parent DN（支援多層）
    return `OU=${name},${parentDn.value}`
  }

  // root DN = OU=self + dcDn（若無 dcDn 就退回顯示原本）
  const dc = (props.dcDn || '').trim()
  if (!dc) {
    // 沒傳 dcDn 就先顯示原本（避免空）
    return props.ou?.ou_dn || `OU=${name}`
  }
  return `OU=${name},${dc}`
})

/** ✅ computed：是否可儲存 */
const canSave = computed(() => {
  errorMsg.value = ''
  if (!form.id) return false
  if (!form.ouname.trim()) return false

  if (form.level === 'child') {
    if (!form.parentId) return false
    if (!parentDn.value) return false
  }
  return true
})

/**
 * ✅ watch：初始化（當開 modal / ou 改變時）
 * - 只做「同步 form」
 * - 不在這裡塞一堆推導邏輯（推導交給 computed）
 */
function hydrateFromPropsOu() {
  errorMsg.value = ''
  confirmDelete.value = false

  const ou = props.ou
  if (!ou) return

  form.id = ou.id ?? ''
  form.ouname = ou.ouname ?? ''
  form.description = ou.description ?? ''

  // 依 parent_dn 判斷層級
  if (ou.parent_dn) {
    form.level = 'child'
    // parentId：用 parent_dn 去反查 ous
    const p = props.ous?.find(x => x.ou_dn === ou.parent_dn)
    form.parentId = p?.id != null ? String(p.id) : ''
  } else {
    form.level = 'root'
    form.parentId = ''
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) hydrateFromPropsOu()
  }
)

watch(
  () => props.ou,
  () => {
    if (props.modelValue) hydrateFromPropsOu()
  }
)

/**
 * ✅ watch：切換層級時清理 parentId
 * - root：清空 parent
 * - child：保留，但若原本沒有 parent 會要求選
 */
watch(
  () => form.level,
  (lv) => {
    errorMsg.value = ''
    if (lv === 'root') {
      form.parentId = ''
    }
  }
)

/** UI actions */
function close() {
  emit('update:modelValue', false)
}

function openDeleteConfirm() {
  confirmDelete.value = true
}

/** ✅ Save：送後端最小必要資料（避免前端算太多） */
async function onSave() {
  try {
    if (!canSave.value) return

    const id = form.id
    const payload: Record<string, any> = {
      description: form.description?.trim() ?? '',
      // ✅ backend patch 需要 parentou + parent_dn 來算新的 ou_dn
      parentou: form.level === 'child' ? 1 : 0,
      parent_dn: form.level === 'child' ? parentDn.value : null,
    }

    // ⚠️ 若你允許改 ouname，記得後端也要支援；目前後端是用資料庫原 ouname 計算 DN
    // 你現在的 server.js PATCH 是讀 DB 的 ou.ouname 來算，因此就算前端改名也不會生效。
    // 所以這裡只有 allowEditOuName=true 時才送 ouname（但你也要同步改後端才會真的改到）
    if (allowEditOuName.value) {
      payload.ouname = form.ouname.trim()
    }

    await updateOu(id, payload)
    emit('saved', { id })
    close()
  } catch (err: any) {
    console.error(err)
    errorMsg.value = err?.response?.data?.message || '儲存失敗'
  }
}

/** ✅ Delete：呼叫後端刪除 + 回傳事件 */
async function onDelete() {
  try {
    const id = form.id
    await deleteOu(id)
    emit('deleted', { id })
    confirmDelete.value = false
    close()
  } catch (err: any) {
    console.error(err)
    errorMsg.value = err?.response?.data?.message || '刪除失敗'
  }
}
</script>

<style scoped>
/* 你可替換成專案現有的 class / scss，這裡只放基本結構 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-card {
  width: 980px;
  max-width: calc(100vw - 48px);
  border-radius: 18px;
  padding: 22px 26px 18px;
  background: rgba(6, 10, 24, 0.92);
  border: 1px solid rgba(255,255,255,.14);
  color: #e8ecff;
  position: relative;
}
.modal-close{
  position:absolute; right:18px; top:14px;
  width:42px; height:42px; border-radius:12px;
  border: 1px solid rgba(255,255,255,.18);
  background: transparent; color:#dfe6ff;
  font-size: 26px; cursor:pointer;
}
.modal-title { font-size: 28px; margin: 4px 0 10px; }
.modal-divider { height:1px; background: rgba(255,255,255,.14); margin: 12px 0 18px; }

.form-grid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 26px;
}
.form-item label{ display:block; margin-bottom:10px; opacity:.92; }
.form-item.full{ grid-column: 1 / -1; }

.input, .select{
  width:100%;
  height: 48px;
  border-radius: 28px;
  padding: 0 18px;
  border: 1px solid rgba(255,255,255,.26);
  background: rgba(20, 28, 56, .52);
  color:#e8ecff;
  outline:none;
}
.input:disabled{
  opacity:.9;
  background: rgba(0,0,0,.38);
}
.input.dn{
  background: rgba(0,0,0,.38);
}
.radio-group{ display:flex; flex-direction:column; gap: 12px; padding-top: 4px; }
.radio{ display:flex; align-items:center; gap: 10px; }
.hint{ margin-top: 8px; font-size: 12px; opacity:.75; }
.hint.warn{ opacity: .9; color: #ffd28d; }

.actions{
  display:flex; align-items:center; justify-content:space-between;
  margin-top: 14px;
}
.actions-right{ display:flex; gap: 12px; }
.btn{
  height: 44px;
  padding: 0 18px;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,.18);
  background: transparent;
  color:#e8ecff;
  cursor:pointer;
}
.btn.primary{
  background: linear-gradient(135deg, rgba(130, 80, 255, .95), rgba(90, 120, 255, .85));
  border: none;
}
.btn.ghost{ background: rgba(255,255,255,.06); }
.btn.danger{
  background: rgba(220, 60, 60, .85);
  border: none;
}
.btn.green{
  background: rgba(60, 180, 120, .85);
  border: none;
}
.btn:disabled{
  cursor:not-allowed;
  opacity:.45;
}

.confirm-mask{
  position:absolute;
  inset:0;
  background: rgba(0,0,0,.55);
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius: 18px;
}
.confirm-card{
  width: 720px;
  max-width: calc(100% - 42px);
  border-radius: 18px;
  padding: 26px;
  background: rgba(6, 10, 24, 0.95);
  border: 1px solid rgba(255,255,255,.14);
  text-align:center;
}
.confirm-icon{
  width:76px; height:76px; border-radius: 999px;
  background: rgba(220,60,60,.9);
  display:flex; align-items:center; justify-content:center;
  margin: 0 auto 14px;
  font-size: 42px;
}
.confirm-text{ font-size: 26px; margin-bottom: 18px; }
.confirm-actions{ display:flex; gap: 14px; justify-content:center; }

.error{
  margin-top: 12px;
  color: #ffb4b4;
  font-size: 13px;
}
</style>
