<template>
    <!-- 此檔案為 MultiSelect 共用元件配置，不直接渲染內容 -->
    <div></div>
</template>

<script setup lang="ts">
import Multiselect from 'vue-multiselect' // 引入 Multiselect 元件
import 'vue-multiselect/dist/vue-multiselect.css' // 引入 Multiselect 樣式

// 導出 Multiselect 元件供其他檔案使用
export { Multiselect }

// 部門單選下拉選單配置
export const departmentSelectConfig = {
    placeholder: '選擇部門',
    label: 'ouname',
    trackBy: 'ou_dn',
    searchable: true,
    clearOnSelect: false,
    hideSelected: false,
    maxHeight: 200,
    allowEmpty: true,
    showLabels: false,
}

// 群組多選下拉選單配置
export const groupsSelectConfig = {
    placeholder: '選擇群組',
    label: 'groupname',
    trackBy: 'groupname',
    searchable: true,
    clearOnSelect: false,
    hideSelected: false,
    maxHeight: 200,
    allowEmpty: true,
    showLabels: false,
    multiple: true,
}
</script>

<style scoped>
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

.multiselect__tag-icon::after {
    color: #ffffff !important;
}

i .multiselect__tag-icon::after {
    color: #ffffff !important;
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
    max-height: 200px;
}

.multiselect-input :deep(.multiselect__option) {
    color: #ffffff !important;
}
</style>