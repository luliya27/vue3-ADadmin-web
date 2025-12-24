// ADadmin-api/server.js
const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const multer = require('multer')

const app = express()
const PORT = process.env.PORT || 3001

// ---- Middleware ----
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ---- Multer 檔案上傳配置 ----
const fs = require('fs')

// 使用記憶體儲存，之後再手動保存到不同目錄
const memoryStorage = multer.memoryStorage()
const upload = multer({ storage: memoryStorage });

// 靜態檔案服務
app.use('/uploads', express.static('uploads'));

// ---- SQLite 連線設定 ----
const dbPath = path.join(__dirname, 'adadmin.db')
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法連線到 SQLite 資料庫：', err.message)
  } else {
    console.log('✅ 已連線到 SQLite 資料庫：', dbPath)
  }
})

// ✅ 增加 SQLite 超時時間以避免 SQLITE_BUSY 錯誤
db.configure('busyTimeout', 10000);

// ---- API 路由定義 ----

// 🔐 登入 API：目前邏輯 = 帳密檢查 + 從 DB 抓使用者資料
// 帳號：從 user_lists 查
// ✅ 保留測試帳密：luliya / AD0227（走 user_lists 驗證 + 更新 last_login_at）
// ✅ 新增最高權限帳密：從 adsettings.sysaccount / adsettings.syspasswd 做實際登入驗證（走系統設定驗證）
// ✅ 前端 LoginView 不用改（仍呼叫 /api/auth/login）
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '缺少帳號或密碼',
    })
  }

  // ✅ A) 保留測試帳密：luliya / AD0227（走 user_lists）
  if (username === 'luliya' && password === 'AD0227') {
    const sql = `
      SELECT username, display_name, last_login_at
      FROM user_lists
      WHERE username = ?
    `
    return db.get(sql, [username], (err, user) => {
      if (err) {
        console.error('登入查詢錯誤：', err)
        return res.status(500).json({ success: false, message: '伺服器錯誤' })
      }

      if (!user) {
        return res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
      }

      // 更新最後登入時間（本地時間）
      const updateSql = `
        UPDATE user_lists
        SET last_login_at = datetime('now', 'localtime')
        WHERE username = ?
      `
      db.run(updateSql, [user.username], (updateErr) => {
        if (updateErr) console.error('更新最後登入時間失敗：', updateErr)

        const fakeToken = `fake-jwt-token-for-${user.username}`

        return res.json({
          success: true,
          token: fakeToken,
          user: {
            username: user.username,
            display_name: user.display_name,
            role: 'tester',
          },
        })
      })
    })
  }

  // ✅ B) 最高權限登入：使用 adsettings.sysaccount / adsettings.syspasswd
  const settingsSql = `
    SELECT sysaccount, syspasswd, companyname, teamname
    FROM adsettings
    LIMIT 1
  `
  db.get(settingsSql, [], (err, s) => {
    if (err) {
      console.error('讀取 adsettings 失敗：', err)
      return res.status(500).json({ success: false, message: '伺服器錯誤' })
    }

    // 沒有設定資料就拒絕（避免空設定被登入）
    if (!s || !s.sysaccount || !s.syspasswd) {
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
    }

    // 比對系統帳密
    if (username !== s.sysaccount || password !== s.syspasswd) {
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
    }

    const fakeToken = `fake-jwt-token-for-${username}`

    return res.json({
      success: true,
      token: fakeToken,
      user: {
        username,
        display_name: '系統管理員',
        role: 'sysadmin',
      },
      // 可選：順便回傳一些顯示用資訊
      meta: {
        companyname: s.companyname || '',
        teamname: s.teamname || '',
      },
    })
  })
})

// 👥 使用者管理 API
// 取得所有使用者清單
app.get('/api/users', (req, res) => {
  const sql = `
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.email,
      u.department,
      u.ou,                -- user_lists 裡存的 DN
      o.ou_dn  AS ou_dn,   -- ous 表裡的 DN（其實跟 u.ou 一樣，但清楚一點）
      o.ouname AS ouname,  -- 👈 這就是你要顯示的「資訊部」「護理部」(部門)
      u.groupsname,        -- 👈 新增：群組清單（文字）
      u.status,
      u.last_login_at
    FROM user_lists u
    LEFT JOIN ous o
      ON u.ou = o.ou_dn
    ORDER BY u.username
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

// 單一使用者詳細資訊
app.get('/api/users/:username', (req, res) => {
  const { username } = req.params

  const sql = `
    SELECT  id, username, display_name, email, department, ou, status, last_login_at
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

// 更新使用者狀態
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

// 新增使用者
app.post('/api/users', express.json(), (req, res) => {
  const { username, display_name, email, passwordHash, department, ou, groupsname, status } = req.body

  // 驗證必填欄位
  if (!username || !display_name || !email || !passwordHash) {
    return res.status(400).json({
      success: false,
      message: '缺少必填欄位：username, display_name, email, passwordHash'
    })
  }

  const sql = `
    INSERT INTO user_lists
    (username, display_name, email, passwordHash, department, ou, groupsname, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `

  const finalStatus = status || 'active'

  db.run(sql, [
    username,
    display_name,
    email,
    passwordHash,
    department || null,
    ou || null,
    groupsname || null,
    finalStatus
  ], function (err) {
    if (err) {
      console.error('新增使用者失敗：', err)
      // 檢查是否為重複的 username
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          message: '此帳號已存在'
        })
      }
      return res.status(500).json({
        success: false,
        message: '新增使用者失敗'
      })
    }

    return res.json({
      success: true,
      data: {
        id: this.lastID,
        username,
        display_name,
        email,
        department: department || null,
        ou: ou || null,
        groupsname: groupsname || null,
        status: finalStatus
      }
    })
  })
})

// 解鎖使用者（將 locked 改為 active）
// ⚠️ 必須放在 PATCH /api/users/:id 之前，因為這個路由更具體
app.patch('/api/users/:id/unlock', express.json(), (req, res) => {
  const { id } = req.params

  const sql = `
    UPDATE user_lists
    SET status = 'active'
    WHERE id = ?
  `

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('解鎖使用者失敗：', err)
      return res.status(500).json({
        success: false,
        message: '解鎖使用者失敗'
      })
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的使用者'
      })
    }

    // 回傳更新後的資料
    const selectSql = `
      SELECT id, username, display_name, email, department, ou, groupsname, status
      FROM user_lists
      WHERE id = ?
    `
    db.get(selectSql, [id], (selectErr, row) => {
      if (selectErr) {
        console.error('查詢更新後使用者錯誤：', selectErr)
        return res.status(500).json({
          success: false,
          message: '查詢更新後使用者失敗',
        })
      }

      return res.json({
        success: true,
        data: row
      })
    })
  })
})

// 修改使用者
app.patch('/api/users/:id', express.json(), (req, res) => {
  const { id } = req.params
  const { display_name, email, department, ou, groupsname, status } = req.body

  // 驗證必填欄位
  if (!display_name || !email || !department || !ou || !groupsname || !status) {
    return res.status(400).json({
      success: false,
      message: '缺少必填欄位：display_name, email, department, ou, groupsname, status'
    })
  }

  const fields = []
  const params = []

  fields.push('display_name = ?')
  params.push(display_name)

  fields.push('email = ?')
  params.push(email)

  fields.push('department = ?')
  params.push(department)
  // if (department !== undefined) {
  //   fields.push('department = ?')
  //   params.push(department || null)
  // }

  fields.push('ou = ?')
  params.push(ou)
  // if (ou !== undefined) {
  //   fields.push('ou = ?')
  //   params.push(ou || null)
  // }

  fields.push('groupsname = ?')
  params.push(groupsname)
  // if (groupsname !== undefined) {
  //   fields.push('groupsname = ?')
  //   params.push(groupsname || null)
  // }

  fields.push('status = ?')
  params.push(status)
  // if (status !== undefined) {
  //   fields.push('status = ?')
  //   params.push(status)
  // }

  params.push(id)

  const sql = `
    UPDATE user_lists
    SET ${fields.join(', ')}
    WHERE id = ?
  `

  db.run(sql, params, function (err) {
    if (err) {
      console.error('修改使用者失敗：', err)
      return res.status(500).json({
        success: false,
        message: '修改使用者失敗'
      })
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的使用者'
      })
    }

    // 回傳更新後的資料
    const selectSql = `
      SELECT id, username, display_name, email, department, ou, groupsname, status
      FROM user_lists
      WHERE id = ?
    `
    db.get(selectSql, [id], (selectErr, row) => {
      if (selectErr) {
        console.error('查詢更新後使用者錯誤：', selectErr)
        return res.status(500).json({
          success: false,
          message: '查詢更新後使用者失敗',
        })
      }

      return res.json({
        success: true,
        data: row
      })
    })
  })
})

// 刪除使用者
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params
  const sql = `
    DELETE FROM user_lists
    WHERE id = ?
  `
  db.run(sql, [id], function (err) {
    if (err) {
      console.error('刪除使用者失敗：', err)
      return res.status(500).json({
        success: false,
        message: '刪除使用者失敗'
      })
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到指定的使用者'
      })
    }

    return res.json({
      success: true,
      message: '使用者已成功刪除'
    })
  })
})

// 👤 群組管理列表 API
// 支援簡單搜尋 ?q= 關鍵字（名稱 + 描述）, ?type=security|distribution , 注：type='security' 會匹配所有 security-* 類型
// 取得群組資訊列表
app.get('/api/groups', (req, res) => {
  const { q, type } = req.query

  const conditions = []
  const params = []

  if (q) {
    conditions.push('(groupname LIKE ? OR description LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }

  if (type) {
    if (type === 'security') {
      // 匹配所有安全性群組類型：security-global, security-domainlocal, security-universal
      conditions.push("(type LIKE 'security-%')")
    } else if (type === 'distribution') {
      conditions.push("type = 'distribution'")
    }
  }

  let sql = `
    SELECT groupname, description, grouptype
    FROM groups
  `

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  // ✅ 這裡一定要是 groupname
  sql += ' ORDER BY groupname'

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查詢 groups 錯誤：', err)
      return res.status(500).json({
        success: false,
        message: '查詢群組清單失敗',
      })
    }

    return res.json({
      success: true,
      data: rows,
    })
  })
})

// 取得某群組底下的使用者清單
app.get('/api/groups/:groupname/users', (req, res) => {
  const { groupname } = req.params

  const sql = `
    SELECT
      u.username,
      u.display_name,
      u.email,
      u.department,
      u.ou,
      o.ou_dn AS ou_dn,
      o.ouname AS ouname,
      u.groupsname,
      u.status,
      u.last_login_at
    FROM user_lists u
    LEFT JOIN ous o
      ON u.ou = o.ou_dn
    WHERE
      (',' || IFNULL(u.groupsname, '') || ',') LIKE '%,' || ? || ',%'
    ORDER BY u.username
  `

  db.all(sql, [groupname], (err, rows) => {
    if (err) {
      console.error('查詢群組成員錯誤：', err)
      return res.status(500).json({
        success: false,
        message: '查詢群組成員失敗',
      })
    }

    return res.json({
      success: true,
      data: rows,
    })
  })
})


// 🌲 組織單位列表 API
// GET /api/ous
// ✅ 支援簡單搜尋 ?q= 關鍵字（名稱 + 描述 + DN）
app.get('/api/ous', (req, res) => {
  const { q } = req.query
  const conditions = []
  const params = []

  if (q) {
    conditions.push('(ouname LIKE ? OR description LIKE ? OR ou_dn LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }

  let sql = `
    SELECT id, ou_dn, ouname, description, parent_dn, parentou
    FROM ous
  `
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY ou_dn'

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查詢 ous 錯誤：', err)
      return res.status(500).json({ success: false, message: '查詢組織單位失敗' })
    }
    return res.json({ success: true, data: rows })
  })
})

// POST /api/ous
// ✅ 建立 OU：支援 root OU / child OU / 將現有 OU 設為子層
app.post('/api/ous', express.json(), (req, res) => {
  const { parentOuName, childOuName, description } = req.body

  const parentName = (parentOuName || '').trim()
  const childName = (childOuName || '').trim()
  const desc = (description || '').trim()

  if (!parentName) {
    return res.status(400).json({ success: false, message: '缺少父 OU 名稱' })
  }

  // 讀取系統設定的 dc_dn
  db.get(`SELECT dc_dn FROM adsettings LIMIT 1`, [], (err, s) => {
    if (err) {
      console.error('讀取 adsettings 失敗：', err)
      return res.status(500).json({ success: false, message: '伺服器錯誤' })
    }
    const dc_dn = (s?.dc_dn || '').trim()
    if (!dc_dn) {
      return res.status(400).json({ success: false, message: '系統尚未設定 DC DN（請先到系統設定儲存網域）' })
    }

    // ---------- A) 建立 root OU ----------
    if (!childName) {
      const ou_dn = `OU=${parentName},${dc_dn}`

      const insertSql = `
        INSERT INTO ous (ou_dn, ouname, description, parent_dn, parentou)
        VALUES (?, ?, ?, NULL, 0)
      `
      return db.run(insertSql, [ou_dn, parentName, desc], function (insErr) {
        if (insErr) {
          console.error('建立 root OU 失敗：', insErr)
          return res.status(400).json({ success: false, message: '建立失敗（可能 OU_DN 已存在）' })
        }

        return res.json({
          success: true,
          data: { id: this.lastID, ou_dn, ouname: parentName, description: desc, parent_dn: null, parentou: 0 },
        })
      })
    }

    // ---------- B) 建立或更新 child OU（child 在 parent 底下） ----------
    // 先找父 OU（不限制 parent_dn，任何 OU 都可以作為父）
    const findParentSql = `
      SELECT id, ou_dn, ouname
      FROM ous
      WHERE ouname = ?
      LIMIT 1
    `
    db.get(findParentSql, [parentName], (pErr, parent) => {
      if (pErr) {
        console.error('查詢父 OU 失敗：', pErr)
        return res.status(500).json({ success: false, message: '伺服器錯誤' })
      }
      if (!parent) {
        return res.status(400).json({ success: false, message: `找不到父 OU：${parentName}（請先建立父 OU）` })
      }

      // child DN = OU=test2,OU=test1,DC=corp,DC=example,DC=com
      const newOuDn = `OU=${childName},${parent.ou_dn}`
      const parent_dn = parent.ou_dn

      // 先檢查是否已存在此 child OU 名稱
      const findChildSql = `
        SELECT id, ou_dn, ouname
        FROM ous
        WHERE ouname = ?
        LIMIT 1
      `
      db.get(findChildSql, [childName], (cErr, existingChild) => {
        if (cErr) {
          console.error('查詢 child OU 失敗：', cErr)
          return res.status(500).json({ success: false, message: '伺服器錯誤' })
        }

        // ✅ 如果 child OU 已存在，則更新它（將其設為 parent 的子層）
        if (existingChild) {
          const oldOuDn = existingChild.ou_dn

          // 遞推更新所有後代的遞歸函數
          const updateDescendantsRecursive = (ouDn, newParentDn, callback) => {
            // 查找所有 parent_dn = ouDn 的直接子 OU
            db.all(
              `SELECT id, ou_dn, ouname FROM ous WHERE parent_dn = ? ORDER BY id`,
              [ouDn],
              (err, descendants) => {
                if (err) {
                  console.error('查詢後代 OU 失敗：', err)
                  return callback(err)
                }

                if (!descendants || descendants.length === 0) {
                  // 沒有後代
                  return callback(null)
                }

                // 更新所有直接子 OU
                let completed = 0
                descendants.forEach((desc) => {
                  const newDescOuDn = desc.ou_dn.replace(ouDn, newParentDn)

                  db.run(
                    `UPDATE ous SET ou_dn = ?, parent_dn = ?, updated_at = datetime('now') WHERE id = ?`,
                    [newDescOuDn, newParentDn, desc.id],
                    (updateErr) => {
                      if (updateErr) {
                        console.error('更新後代 OU 失敗：', updateErr)
                        return callback(updateErr)
                      }

                      // 遞推更新此 OU 的子孫
                      updateDescendantsRecursive(desc.ou_dn, newDescOuDn, (recursErr) => {
                        completed++
                        if (completed === descendants.length) {
                          callback(recursErr)
                        }
                      })
                    }
                  )
                })
              }
            )
          }

          // 檢查 child OU 是否有子層
          db.get(
            `SELECT 1 FROM ous WHERE parent_dn = ? LIMIT 1`,
            [oldOuDn],
            (checkErr, hasChild) => {
              if (checkErr) {
                console.error('檢查子層失敗：', checkErr)
                return res.status(500).json({ success: false, message: '伺服器錯誤' })
              }

              // child OU 的 parentou：若有子層則為 1，否則為 0
              const childParentou = hasChild ? 1 : 0

              // 更新 child OU 本身（不要硬編碼 parentou，根據是否有子層設置）
              db.run(
                `UPDATE ous SET ou_dn = ?, parent_dn = ?, parent_id = ?, parentou = ?, updated_at = datetime('now') WHERE id = ?`,
                [newOuDn, parent_dn, parent.id, childParentou, existingChild.id],
                (uErr) => {
                  if (uErr) {
                    console.error('更新 child OU 失敗：', uErr)
                    return res.status(400).json({ success: false, message: '更新失敗' })
                  }

                  // 級聯更新所有後代
                  updateDescendantsRecursive(oldOuDn, newOuDn, (descErr) => {
                    if (descErr) {
                      console.error('級聯更新失敗：', descErr)
                      return res.status(400).json({ success: false, message: '級聯更新失敗' })
                    }

                    // 更新父 OU 的 parentou = 1（表示有子層）
                    db.run(`UPDATE ous SET parentou = 1, updated_at = datetime('now') WHERE id = ?`, [parent.id], (pErr) => {
                      if (pErr) console.error('更新父 OU parentou 失敗：', pErr)
                      return res.json({
                        success: true,
                        data: { id: existingChild.id, ou_dn: newOuDn, ouname: childName, description: existingChild.description || '', parent_dn, parent_id: parent.id, parentou: childParentou },
                      })
                    })
                  })
                }
              )
            }
          )
        } else {
          // ✅ 如果 child OU 不存在，則新建立
          const insertChildSql = `
            INSERT INTO ous (ou_dn, ouname, description, parent_dn, parent_id, parentou)
            VALUES (?, ?, ?, ?, ?, 0)
          `
          db.run(insertChildSql, [newOuDn, childName, desc, parent_dn, parent.id], function (insErr) {
            if (insErr) {
              console.error('建立 child OU 失敗：', insErr)
              return res.status(400).json({ success: false, message: '建立失敗' })
            }

            // ✅ child 建立成功後，把父 OU 標記為「有子層」
            db.run(`UPDATE ous SET parentou = 1, updated_at = datetime('now') WHERE id = ?`, [parent.id], (uErr) => {
              if (uErr) console.error('更新父 OU parentou 失敗：', uErr)
              return res.json({
                success: true,
                data: { id: this.lastID, ou_dn: newOuDn, ouname: childName, description: desc, parent_dn, parent_id: parent.id, parentou: 0 },
              })
            })
          })
        }
      })
    })
  })
})

// PATCH /api/ous/:id
// 更新 OU：部門OU別名 (修改 OU：只改 description)
// app.patch('/api/ous/:id', express.json(), (req, res) => {
//   const { id } = req.params
//   const description = (req.body.description || '').trim()

//   const sql = `UPDATE ous SET description = ? WHERE id = ?`
//   db.run(sql, [description, id], function (err) {
//     if (err) {
//       console.error('更新 OU 失敗：', err)
//       return res.status(500).json({ success: false, message: '更新失敗' })
//     }
//     if (this.changes === 0) {
//       return res.status(404).json({ success: false, message: '找不到 OU' })
//     }
//     return res.json({ success: true })
//   })
// })
// 也能改 parent_dn / parentou / ouname / ou_dn
app.patch('/api/ous/:id', express.json(), (req, res) => {
  const { id } = req.params
  const { description, parent_dn, parentou, ouname, ou_dn } = req.body

  if (parentou === 1 && !parent_dn) {
    return res.status(400).json({
      success: false,
      message: '設定子層 OU 時，parent_dn 不可為空'
    })
  }

  const fields = []
  const params = []

  if (description !== undefined) {
    fields.push('description = ?')
    params.push(description)
  }

  if (parentou !== undefined) {
    fields.push('parentou = ?')
    params.push(parentou)
  }

  if (parent_dn !== undefined) {
    fields.push('parent_dn = ?')
    params.push(parent_dn)
  }

  if (ouname !== undefined) {
    fields.push('ouname = ?')
    params.push(ouname)
  }

  if (ou_dn !== undefined) {
    fields.push('ou_dn = ?')
    params.push(ou_dn)
  }

  if (!fields.length) {
    return res.json({ success: true })
  }

  params.push(id)

  const sql = `
    UPDATE ous
    SET ${fields.join(', ')}
    WHERE id = ?
  `

  db.run(sql, params, function (err) {
    if (err) {
      console.error('更新 OU 失敗：', err)
      return res.status(500).json({ success: false, message: '更新失敗' })
    }

    // 回傳更新后的 OU 資料
    db.get(`SELECT * FROM ous WHERE id = ?`, [id], (err, ou) => {
      if (err) {
        console.error('查詢更新后的 OU 失敗：', err)
        return res.status(500).json({ success: false, message: '查詢失敗' })
      }
      res.json({ success: true, data: ou })
    })
  })
})

// DELETE /api/ous/:id
// 刪除 OU + 防呆
app.delete('/api/ous/:id', (req, res) => {
  const { id } = req.params

  // 先查被刪的 OU 資料
  db.get(`SELECT id, ou_dn, parent_dn FROM ous WHERE id = ?`, [id], (err, ou) => {
    if (err) {
      console.error('查詢 OU 失敗：', err)
      return res.status(500).json({ success: false, message: '伺服器錯誤' })
    }
    if (!ou) {
      return res.status(404).json({ success: false, message: '找不到 OU' })
    }

    // (1) 防呆：是否有子 OU
    db.get(`SELECT 1 FROM ous WHERE parent_dn = ? LIMIT 1`, [ou.ou_dn], (cErr, child) => {
      if (cErr) {
        console.error('查詢子 OU 失敗：', cErr)
        return res.status(500).json({ success: false, message: '伺服器錯誤' })
      }
      if (child) {
        return res.status(400).json({
          success: false,
          message: '此 OU 底下仍有子層，請先刪除子 OU',
        })
      }

      // (2) 防呆：是否有 user 引用此 OU
      db.get(`SELECT 1 FROM user_lists WHERE ou = ? LIMIT 1`, [ou.ou_dn], (uErr, used) => {
        if (uErr) {
          console.error('查詢 user_lists 引用失敗：', uErr)
          return res.status(500).json({ success: false, message: '伺服器錯誤' })
        }
        if (used) {
          return res.status(400).json({
            success: false,
            message: '此 OU 仍被使用者指派中，無法刪除',
          })
        }

        // (3) 可以刪
        db.run(`DELETE FROM ous WHERE id = ?`, [id], function (dErr) {
          if (dErr) {
            console.error('刪除 OU 失敗：', dErr)
            return res.status(500).json({ success: false, message: '刪除失敗' })
          }

          // (4) 刪除後：若有父 OU，檢查父 OU 是否還有子 OU
          const parentDn = ou.parent_dn
          if (!parentDn) {
            return res.json({ success: true })
          }

          db.get(`SELECT 1 FROM ous WHERE parent_dn = ? LIMIT 1`, [parentDn], (chkErr, stillHasChild) => {
            if (chkErr) {
              console.error('檢查父 OU 子層失敗：', chkErr)
              return res.json({ success: true }) // 不影響刪除結果
            }

            if (!stillHasChild) {
              db.run(`UPDATE ous SET parentou = 0 WHERE ou_dn = ?`, [parentDn], (upErr) => {
                if (upErr) console.error('回寫父 OU parentou 失敗：', upErr)
                return res.json({ success: true })
              })
            } else {
              return res.json({ success: true })
            }
          })
        })
      })
    })
  })
})


// 🖥️ 電腦管理列表 API
// GET /api/computers
app.get('/api/computers', (req, res) => {
  const { q = '', domain = '', conn = '', acc = '' } = req.query

  const where = []
  const params = []

  if (q) {
    where.push(`(cpname LIKE ? OR os LIKE ? OR ouname LIKE ?)`)
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (domain) { where.push(`DomainMembershipStatus = ?`); params.push(domain) }
  if (conn) { where.push(`ConnectivityStatus = ?`); params.push(conn) }
  if (acc) { where.push(`ComputerAccount_inADStatus = ?`); params.push(acc) }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // const sql 移除 created_at, updated_at
  const sql = `
    SELECT id, cpname, os, ouname, ou_id,
           DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus
    FROM computers
    ${whereSql}
    ORDER BY cpname ASC
  `


  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查詢 computers 錯誤：', err)
      return res.status(500).json({ success: false, message: '查詢失敗' })
    }
    res.json({ success: true, data: rows })
  })
})

// POST /api/computers
app.post('/api/computers', (req, res) => {
  const {
    cpname, os, ouname = null, ou_id = null,
    DomainMembershipStatus = 'NotJoined',
    ConnectivityStatus = 'Offline',
    ComputerAccount_inADStatus = 'Unused'
  } = req.body

  if (!cpname || !os) {
    return res.status(400).json({ success: false, message: 'cpname / os 必填' })
  }

  const sql = `
    INSERT INTO computers
    (cpname, os, ouname, ou_id, DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `
  db.run(sql, [
    cpname, os, ouname, ou_id,
    DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus
  ], function (err) {
    if (err) {
      console.error('新增 computer 失敗：', err)
      return res.status(400).json({ success: false, message: '新增失敗（可能 cpname 重複）' })
    }
    res.json({ success: true, data: { id: this.lastID } })
  })
})

// PATCH /api/computers/:id
app.patch('/api/computers/:id', (req, res) => {
  const id = Number(req.params.id)
  const {
    cpname, os, ouname, ou_id,
    DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus
  } = req.body

  const fields = []
  const params = []

  const setIf = (k, v) => {
    if (v !== undefined) { fields.push(`${k} = ?`); params.push(v) }
  }

  setIf('cpname', cpname)
  setIf('os', os)
  setIf('ouname', ouname)
  setIf('ou_id', ou_id)
  setIf('DomainMembershipStatus', DomainMembershipStatus)
  setIf('ConnectivityStatus', ConnectivityStatus)
  setIf('ComputerAccount_inADStatus', ComputerAccount_inADStatus)

  if (!fields.length) return res.json({ success: true })

  fields.push(`updated_at = datetime('now')`)

  const sql = `UPDATE computers SET ${fields.join(', ')} WHERE id = ?`
  params.push(id)

  db.run(sql, params, function (err) {
    if (err) {
      console.error('更新 computer 失敗：', err)
      return res.status(400).json({ success: false, message: '更新失敗（可能 cpname 重複）' })
    }
    res.json({ success: true })
  })
})

// DELETE /api/computers/:id
app.delete('/api/computers/:id', (req, res) => {
  const id = Number(req.params.id)
  db.run(`DELETE FROM computers WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('刪除 computer 失敗：', err)
      return res.status(500).json({ success: false, message: '刪除失敗' })
    }
    res.json({ success: true })
  })
})


// ⚙️ 系統設定 API
// 取得單一設定
// 取得系統設定（預期只有一筆 id=1）
app.get('/api/adsettings', (req, res) => {
  db.get('SELECT * FROM adsettings LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('查詢 adsettings 錯誤：', err)
      return res.status(500).json({
        success: false,
        message: '查詢系統設定失敗'
      })
    }

    if (!row) {
      // 如果還沒有資料，就給一個空殼
      return res.json({
        success: true,
        // 不會回傳給前端
        data: {
          id: 1,
          companyname: '',
          teamname: '',
          syslogo: '',
          sysbackgroundimg: '',
          sysaccount: '',
          syspasswd: '', // 明碼比對
          domainname: '',
          dc_dn: '',
          ip: '',
          subnetmask: '',
          defaultgateway: '',
          preferredDNSserver: '',
          secondaryDNSserver: ''
        }
      })
    }

    return res.json({ success: true, data: row })
  })
})

// 更新設定（只有一筆，用 id 或直接 UPDATE 全表）
app.put('/api/adsettings', express.json(), (req, res) => {
  const s = req.body

  const sql = `
    UPDATE adsettings SET
      companyname = ?,
      teamname = ?,
      syslogo = ?,
      sysbackgroundimg = ?,
      sysaccount = ?,
      syspasswd = ?,
      domainname = ?,
      dc_dn = ?,
      ip = ?,
      subnetmask = ?,
      defaultgateway = ?,
      preferredDNSserver = ?,
      secondaryDNSserver = ?
    WHERE id = ?
  `

  const params = [
    s.companyname,
    s.teamname,
    s.syslogo,
    s.sysbackgroundimg,
    s.sysaccount,
    s.syspasswd,
    s.domainname,
    s.dc_dn,
    s.ip,
    s.subnetmask,
    s.defaultgateway,
    s.preferredDNSserver,
    s.secondaryDNSserver,
    s.id ?? 1
  ]

  db.run(sql, params, function (err) {
    if (err) {
      console.error('更新 adsettings 錯誤：', err)
      return res.status(500).json({
        success: false,
        message: '更新系統設定失敗'
      })
    }

    return res.json({ success: true })
  })
})

// ---- 檔案上傳 API ----
// 上傳 LOGO 或背景圖
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '未選取檔案' });
  }

  const field = req.body.field || 'others';

  // ✅ 驗證 field 只能是特定欄位
  const validFields = ['syslogo', 'sysbackgroundimg'];
  if (!validFields.includes(field)) {
    return res.status(400).json({ success: false, message: '無效的欄位' });
  }

  // 建立檔案目錄
  const uploadDir = path.join(__dirname, 'uploads', field);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 生成檔名
  const ext = path.extname(req.file.originalname);
  const timestamp = Date.now();
  const filename = `${timestamp}${ext}`;
  const filePath = path.join(uploadDir, filename);

  // 將檔案保存到磁碟
  fs.writeFileSync(filePath, req.file.buffer);

  const fileUrl = `/uploads/${field}/${filename}`;

  // 更新資料表 adsettings
  const sql = `UPDATE adsettings SET ${field} = ? WHERE id = 1`;

  db.run(sql, [fileUrl], function (err) {
    if (err) {
      console.error('更新 adsettings 圖片欄位失敗：', err);
      return res.status(500).json({ success: false });
    }

    return res.json({
      success: true,
      url: fileUrl
    });
  });
});

// ---- 啟動伺服器 ----
app.listen(PORT, () => {
  console.log(`ADadmin-api server running on http://localhost:${PORT}`)
})