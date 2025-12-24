// ADadmin-api/server.js
const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001

// ---- Middleware ----
app.use(cors())
app.use(express.json())

// ---- SQLite 連線設定 ----
const dbPath = path.join(__dirname, 'adadmin.db')
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 無法連線到 SQLite 資料庫：', err.message)
    } else {
        console.log('✅ 已連線到 SQLite 資料庫：', dbPath)
    }
})

// ---- API 路由定義 ----

// 🔐 登入 API：目前邏輯 = 帳密檢查 + 從 DB 抓使用者資料
// 帳號：從 user_lists 查
// 密碼：暫時仍寫死 AD0227（後續你會改成 AD 驗證）
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: '缺少帳號或密碼',
        })
    }

    // 先從 DB 查是否有這個使用者
    const sql = `
    SELECT username, display_name, last_login_at
    FROM user_lists
    WHERE username = ?
  `
    db.get(sql, [username], (err, user) => {
        if (err) {
            console.error('登入查詢錯誤：', err)
            return res.status(500).json({
                success: false,
                message: '伺服器錯誤',
            })
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '帳號或密碼錯誤',
            })
        }

        // ⚠️ 目前密碼邏輯：寫死 AD0227
        // 之後你會改成：拿 username 去 AD 驗證
        if (password !== 'AD0227') {
            return res.status(401).json({
                success: false,
                message: '帳號或密碼錯誤',
            })
        }

        // ✅ 密碼正確 → 更新最後登入時間（使用本地時間）
        const updateSql = `
      UPDATE user_lists
      SET last_login_at = datetime('now', 'localtime')
      WHERE username = ?
    `

        db.run(updateSql, [user.username], function (updateErr) {
            if (updateErr) {
                console.error('更新最後登入時間失敗：', updateErr)
                // 不因為 update 失敗就擋掉登入，照樣讓他登入
            }

            const fakeToken = `fake-jwt-token-for-${user.username}`

            return res.json({
                success: true,
                token: fakeToken,
                user: {
                    username: user.username,
                    display_name: user.display_name,
                },
            })
        })
    })
})

// 👥 取得所有使用者清單
app.get('/api/users', (req, res) => {
    const sql = `
    SELECT username, display_name, email, department, ou, status, last_login_at
    FROM user_lists
    ORDER BY username
  `

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('查詢 user_lists 錯誤：', err)
            return res.status(500).json({
                success: false,
                message: '查詢使用者清單失敗',
            })
        }

        return res.json({
            success: true,
            data: rows,
        })
    })
})

// 👤 單一使用者詳細資訊
app.get('/api/users/:username', (req, res) => {
    const { username } = req.params

    const sql = `
    SELECT username, display_name, email, department, ou, status, last_login_at
    FROM user_lists
    WHERE username = ?
  `

    db.get(sql, [username], (err, row) => {
        if (err) {
            console.error('查詢單一使用者錯誤：', err)
            return res.status(500).json({
                success: false,
                message: '查詢使用者失敗',
            })
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: '找不到指定的使用者',
            })
        }

        return res.json({
            success: true,
            data: row,
        })
    })
})


// 更新使用者狀態 API
// 🔧 更新使用者狀態（鎖定 / 解鎖 / 停用）
app.patch('/api/users/:username/status', (req, res) => {
  const { username } = req.params
  const { status } = req.body

  const allowedStatuses = ['active', 'locked', 'disabled']
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: '不合法的狀態值',
    })
  }

  const sql = `
    UPDATE user_lists
    SET status = ?
    WHERE username = ?
  `
  // 執行更新
  db.run(sql, [status, username], function (err) {
    if (err) {
      console.error('更新使用者狀態錯誤：', err)
      return res.status(500).json({
        success: false,
        message: '更新使用者狀態失敗',
      })
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的使用者',
      })
    }

    // 回傳更新後的資料
    const selectSql = `
      SELECT username, display_name, email, department, ou, status, last_login_at
      FROM user_lists
      WHERE username = ?
    `
    db.get(selectSql, [username], (selectErr, row) => {
      if (selectErr) {
        console.error('查詢更新後使用者錯誤：', selectErr)
        return res.status(500).json({
          success: false,
          message: '查詢更新後使用者失敗',
        })
      }

      return res.json({
        success: true,
        data: row,
      })
    })
  })
})


// ---- 啟動伺服器 ----
app.listen(PORT, () => {
    console.log(`ADadmin-api server running on http://localhost:${PORT}`)
})