<template>
    <div v-if="visible" class="mask" @click.self="$emit('cancel')">
        <div class="confirm-box">
            <div class="icon">!</div>
            <div class="title">確定將電腦資訊刪除？</div>
            <div class="sub" v-if="computer?.cpname">電腦名稱：{{ computer.cpname }}</div>

            <div class="footer-actions">
                <button class="btn ok" @click="$emit('cancel')">取消</button>
                <button class="btn danger" @click="$emit('confirm')">刪除</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Computer } from '@/services/adadmin'
defineProps<{ visible: boolean; computer: Computer | null }>()
defineEmits<{ (e: 'cancel'): void; (e: 'confirm'): void }>()
</script>

<style scoped>
.mask {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, .62);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 100;
}

.confirm-box {
    width: min(500px, 100%);
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, .3);
    background: rgba(15, 23, 42, .96);
    padding: 26px 22px 18px;
    text-align: center;
}

.icon {
    width: 68px;
    height: 68px;
    margin: 0 auto 14px;
    border-radius: 999px;
    background: rgba(239, 68, 68, .8);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 800;
}

.title {
    font-size: 22px;
    font-weight: 800;
    color: #e5e7eb;
    margin-bottom: 6px;
}

.sub {
    font-size: 13px;
    color: #9ca3af;
    margin-bottom: 14px;
}

.footer-actions {
    display: flex;
    justify-content: center;
    gap: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(148, 163, 184, .2);
}


.btn {
    height: 36px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(2, 6, 23, 0.5);
    color: #e5e7eb;
    cursor: pointer;
    font-size: 13px;
}

.btn.ok {
    border-color: rgba(34, 197, 94, 0.55);
}

.btn.danger {
    border: none;
    background: rgba(239, 68, 68, 0.95);
    color: #fff;
}
</style>
