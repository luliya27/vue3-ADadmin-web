// ADadmin-api/server.js
const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
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

    // ✅ 密碼正確 → 更新最後登入時間
    const updateSql = `
      UPDATE user_lists
      SET last_login_at = datetime('now', 'localtime')
      WHERE username = ?
    `
    // 執行更新最後登入時間的 SQL
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
