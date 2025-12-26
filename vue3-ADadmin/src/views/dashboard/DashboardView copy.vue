<template>
    <div class="dashboard-page">
        <section class="cards">
            <div class="card">
                <div class="card-header">
                    <div class="card-img green">
                        <font-awesome-icon icon="fa-solid fa-users" />
                    </div>
                    <h2>AD使用者 總數</h2>
                </div>
                <p class="number">1234</p>
                <p class="hint">目前先用假資料顯示，之後串 ADadmin-api</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-img red">
                        <font-awesome-icon icon="fa-solid fa-lock" />
                    </div>
                    <h2>使用者狀態鎖定</h2>
                </div>
                <p class="number warning">1</p>
                <p class="hint">目前先用假資料顯示，之後串 ADadmin-api</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-img yellow">
                        <font-awesome-icon icon="fa-solid fa-desktop" />
                    </div>
                    <h2>電腦連線 線上總數</h2>
                </div>
                <p class="number">15</p>
                <p class="hint">目前先用假資料顯示，之後串 ADadmin-api</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-img purple">
                        <font-awesome-icon icon="fa-solid fa-right-to-bracket" />
                    </div>
                    <h2>今日登入 總數</h2>
                </div>
                <p class="number">1</p>
                <p class="hint">未來可以改成真實登入紀錄統計</p>
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
    font-size: 18px;
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

/* card-header */
.card-header {
    display: flex;
    justify-content: space-between;
    font-size: 24px;
}

.card-img {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    border-radius: 3px;
    margin-right: 10px;
    color: #ffffff;
}

.green {
    background: #66bb6a;
}

.yellow {
    background: #ffa726;
}

.red {
    background: #ef4444;
}

.purple {
    background: #a855f7;
}
</style>
