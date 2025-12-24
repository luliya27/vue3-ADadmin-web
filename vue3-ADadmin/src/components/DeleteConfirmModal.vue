<template>
    <div v-if="visible" class="mask" @click.self="emit('cancel')">
        <div class="card">
            <div class="icon">!</div>
            <div class="text">{{ message }}</div>

            <div class="actions">
                <button class="btn cancel" @click="emit('cancel')">取消</button>
                <button class="btn danger" @click="emit('confirm')">刪除</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    visible: boolean
    message: string
}>()

const emit = defineEmits<{
    (e: 'cancel'): void
    (e: 'confirm'): void
}>()
</script>

<style scoped>
.mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999
}

.card {
    width: min(760px, 92vw);
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, .18);
    background: rgba(10, 18, 35, .92);
    backdrop-filter: blur(10px);
    padding: 42px 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px
}

.icon {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    background: rgba(220, 68, 68, .9);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 44px;
    font-weight: 900
}

.text {
    color: #fff;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 1px
}

.actions {
    display: flex;
    gap: 16px;
    margin-top: 10px
}

.btn {
    height: 44px;
    min-width: 120px;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, .18);
    background: transparent;
    color: #fff;
    cursor: pointer
}

.btn.cancel {
    background: rgba(26, 168, 92, .9);
    border-color: transparent
}

.btn.danger {
    background: rgba(220, 68, 68, .9);
    border-color: transparent
}
</style>
