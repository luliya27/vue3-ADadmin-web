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
                <p class="number">{{ stats.totalUsers }}</p>
                <p class="hint">{{ loading ? '載入中...' : '即時統計資料' }}</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-img red">
                        <font-awesome-icon icon="fa-solid fa-lock" />
                    </div>
                    <h2>使用者狀態鎖定</h2>
                </div>
                <p class="number warning">{{ stats.lockedUsers }}</p>
                <p class="hint">{{ loading ? '載入中...' : '即時統計資料' }}</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-img yellow">
                        <font-awesome-icon icon="fa-solid fa-desktop" />
                    </div>
                    <h2>電腦連線 線上總數</h2>
                </div>
                <p class="number">{{ stats.onlineComputers }}</p>
                <p class="hint">{{ loading ? '載入中...' : '即時統計資料' }}</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-img purple">
                        <font-awesome-icon icon="fa-solid fa-right-to-bracket" />
                    </div>
                    <h2>今日登入 總數</h2>
                </div>
                <p class="number">{{ stats.todayLogins }}</p>
                <p class="hint">{{ loading ? '載入中...' : '今日登入統計' }}</p>
            </div>
        </section>

        <section class="todo">
            <h2>開發 TODO</h2>
            <ul>
                <li>✅ 完成登入 / 登出 + Layout 架構</li>
                <li>✅ 使用者列表 UserListView：顯示模擬使用者的真實資料</li>
                <li>✅ Dashboard 串接 API 顯示統計數據</li>
                <li>⏳ 使用者詳細頁：檢視 AD 屬性（目前先用假資料顯示）</li>
            </ul>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchUsers, fetchComputers } from '@/services/adadmin'

// 統計數據
const stats = ref({
    totalUsers: 0,
    lockedUsers: 0,
    onlineComputers: 0,
    todayLogins: 0
})

const loading = ref(true)

// 載入統計資料
const loadStats = async () => {
    loading.value = true
    try {
        // 獲取使用者資料
        const users = await fetchUsers()
        stats.value.totalUsers = users.length
        stats.value.lockedUsers = users.filter(u => u.status === 'locked').length

        // 計算今日登入數量
        const today = new Date().toISOString().split('T')[0]
        stats.value.todayLogins = users.filter(u =>
            u.last_login_at && u.last_login_at.startsWith(today)
        ).length

        // 獲取電腦資料
        const computers = await fetchComputers()
        stats.value.onlineComputers = computers.filter(
            c => c.ConnectivityStatus === 'Online'
        ).length
    } catch (error) {
        console.error('載入統計資料失敗：', error)
    } finally {
        loading.value = false
    }
}

onMounted(loadStats)
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
