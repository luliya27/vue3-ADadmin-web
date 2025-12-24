<!-- src/views/dashboard/DashboardView.vue -->
<template>
    <div class="dashboard-page">
        <section class="cards">
            <div class="card">
                <h2>AD 使用者總數</h2>
                <p class="number">1234</p>
                <p class="hint">目前先用假資料顯示，之後串 ADadmin-api</p>
            </div>

            <div class="card">
                <h2>今日登入</h2>
                <p class="number">56</p>
                <p class="hint">未來可以改成真實登入紀錄統計</p>
            </div>

            <div class="card">
                <h2>異常帳號</h2>
                <p class="number warning">8</p>
                <p class="hint">例如：鎖定 / 停用 / 密碼過期</p>
            </div>
        </section>

        <section class="todo">
            <h2>開發 TODO</h2>
            <ul>
                <li>✅ 完成登入 / 登出 + Layout 架構</li>
                <li>⏳ 使用者列表 UserListView：顯示假資料</li>
                <li>⏳ 使用者詳細頁：檢視 AD 屬性</li>
                <li>⏳ 將前端假資料改成呼叫 ADadmin-api</li>
            </ul>
        </section>
    </div>
</template>

<script setup lang="ts">
// 目前這頁是純展示，不需要 script
</script>

<style scoped>
.dashboard-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
}

.card {
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(148, 163, 184, 0.4);
}

.card h2 {
    font-size: 14px;
    margin-bottom: 6px;
}

.number {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 6px;
}

.number.warning {
    color: #f97373;
}

.hint {
    font-size: 12px;
    color: #9ca3af;
}

.todo h2 {
    font-size: 14px;
    margin-bottom: 8px;
}

.todo ul {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
}
</style>
