<template>
  <div class="mask" @click.self="$emit('close')">
    <div class="modal">
      <div class="header">
        <div class="title">修改組織單位</div>
        <button class="x" type="button" @click="$emit('close')">×</button>
      </div>

      <div class="body">
        <div class="row">
          <div class="field">
            <label>OU名稱：</label>
            <input :value="ou.ouname" class="input dark" readonly />
          </div>

          <div class="field">
            <label>別名（部門）：</label>
            <input v-model.trim="description" class="input" placeholder="例如：資訊部" />
          </div>
        </div>

        <!-- ✅ 調整層級 -->
        <div class="row">
          <div class="field checkbox">
            <label>設為子層 OU：</label>
            <input type="checkbox" v-model="asChild" />
          </div>

          <div class="field" v-if="asChild">
            <label>選擇父 OU：</label>
            <select v-model="parentDn" class="input">
              <option value="">請選擇父 OU</option>
              <option v-for="p in parentOptions" :key="p.id" :value="p.ou_dn">
                {{ p.ouname }}
              </option>
            </select>

            <div class="warn" v-if="!parentDn">
              請選擇父 OU，才能將此 OU 設為子層
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field full">
            <label>OU_DN：</label>
            <input :value="ou.ou_dn" class="input dark" readonly />
          </div>
        </div>
      </div>

      <div class="footer between">
        <button class="btn danger" type="button" @click="$emit('delete')">刪除</button>

        <div class="right">
          <button class="btn ghost" type="button" @click="$emit('close')">取消</button>
          <button class="btn primary" type="button" :disabled="!canSave" @click="submit">
            儲存
          </button>
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
  description: string
  parent_dn: string | null
  parentou: number
}

const props = defineProps<{
  ou: OuItem
  ouOptions: OuItem[] // ✅ 全部 OU 清單（用來選父 OU）
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { description: string; parentou: number; parent_dn: string | null }): void
  (e: 'delete'): void
}>()

const description = ref('')
const asChild = ref(false)
const parentDn = ref('')

watch(
  () => props.ou,
  (v) => {
    description.value = v?.description || ''
    asChild.value = !!v?.parent_dn
    parentDn.value = v?.parent_dn || ''
  },
  { immediate: true }
)

// 父 OU 選項：排除自己 + 排除自己的子孫（這裡先做最基本排除自己即可）
// 若你要更嚴謹（避免循環），下一步我再幫你補「循環檢查」
const parentOptions = computed(() =>
  (props.ouOptions || []).filter((o) => o.id !== props.ou.id)
)

const canSave = computed(() => {
  if (!asChild.value) return true
  return !!parentDn.value
})

const submit = () => {
  emit('submit', {
    description: description.value.trim(),
    parentou: asChild.value ? 1 : 0,
    parent_dn: asChild.value ? parentDn.value : null,
  })
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}

.modal {
  width: min(860px, 100%);
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 18px;
  overflow: hidden;
}

.header {
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

.x {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(2, 6, 23, 0.5);
  color: #e5e7eb;
  cursor: pointer;
}

.body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  flex: 0 0 220px;
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

.warn {
  margin-top: 2px;
  font-size: 12px;
  color: #fca5a5;
}

.footer {
  display: flex;
  padding: 14px 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.footer.between {
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
