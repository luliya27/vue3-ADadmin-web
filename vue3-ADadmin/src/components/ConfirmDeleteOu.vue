<template>
    <div class="mask" @click.self="$emit('cancel')">
        <div class="confirm">
            <div class="icon">!</div>
            <div class="text">確定將組織單位刪除？</div>

            <div class="actions">
                <button class="btn ok" @click="$emit('cancel')">取消</button>
                <button class="btn danger" @click="$emit('confirm')">刪除</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineEmits<{
    (e: 'cancel'): void
    (e: 'confirm'): void
}>()
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
    z-index: 60;
}

.confirm {
    width: min(420px, 100%);
    background: rgba(15, 23, 42, 0.96);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 18px;
    padding: 18px 18px 16px;
    text-align: center;
}

.icon {
    width: 46px;
    height: 46px;
    border-radius: 999px;
    margin: 0 auto 10px;
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 22px;
    color: #fff;
    background: rgba(239, 68, 68, 0.95);
}

.text {
    color: #e5e7eb;
    font-size: 14px;
    margin-bottom: 14px;
}

.actions {
    display: flex;
    justify-content: center;
    gap: 12px;
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
