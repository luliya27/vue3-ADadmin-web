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
const dbPath = path.join(__dirname, 'db', 'adadmin.db')
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法連線到 SQLite 資料庫：', err.message)
  } else {
    console.log('✅ 已連線到 SQLite 資料庫：', dbPath)
  }
})

// ✅ 增加 SQLite 超時時間以避免 SQLITE_BUSY 錯誤
db.configure('busyTimeout', 10000);

// ✅ 初始化數據庫表
function initializeDatabase() {
  const initSqlDir = path.join(__dirname, 'sql');
  const sqlFiles = [
    'init_adsettings.sql',
    'init_user_lists.sql',
    'init_groups.sql',
    'init_ous.sql',
    'init_computers.sql'
  ];

  console.log('[init] 開始初始化數據庫...');
  
  db.serialize(() => {
    // 檢查 adsettings 表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='adsettings'", (err, row) => {
      if (!row) {
        console.log('[init] adsettings 表不存在，開始初始化...');
        const initAdSettingsSql = require('fs').readFileSync(path.join(initSqlDir, 'init_adsettings.sql'), 'utf8');
        db.exec(initAdSettingsSql, (execErr) => {
          if (execErr) {
            console.error('[init] adsettings 初始化失敗:', execErr);
          } else {
            console.log('[init] ✅ adsettings 表初始化成功');
          }
        });
      }
    });

    // 檢查 user_lists 表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_lists'", (err, row) => {
      if (!row) {
        console.log('[init] user_lists 表不存在，開始初始化...');
        const initUserListsSql = require('fs').readFileSync(path.join(initSqlDir, 'init_user_lists.sql'), 'utf8');
        db.exec(initUserListsSql, (execErr) => {
          if (execErr) {
            console.error('[init] user_lists 初始化失敗:', execErr);
          } else {
            console.log('[init] ✅ user_lists 表初始化成功');
          }
        });
      }
    });

    // 檢查 groups 表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='groups'", (err, row) => {
      if (!row) {
        console.log('[init] groups 表不存在，開始初始化...');
        const initGroupsSql = require('fs').readFileSync(path.join(initSqlDir, 'init_groups.sql'), 'utf8');
        db.exec(initGroupsSql, (execErr) => {
          if (execErr) {
            console.error('[init] groups 初始化失敗:', execErr);
          } else {
            console.log('[init] ✅ groups 表初始化成功');
          }
        });
      }
    });

    // 檢查 ous 表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='ous'", (err, row) => {
      if (!row) {
        console.log('[init] ous 表不存在，開始初始化...');
        const initOusSql = require('fs').readFileSync(path.join(initSqlDir, 'init_ous.sql'), 'utf8');
        db.exec(initOusSql, (execErr) => {
          if (execErr) {
            console.error('[init] ous 初始化失敗:', execErr);
          } else {
            console.log('[init] ✅ ous 表初始化成功');
          }
        });
      }
    });

    // 檢查 computers 表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='computers'", (err, row) => {
      if (!row) {
        console.log('[init] computers 表不存在，開始初始化...');
        const initComputersSql = require('fs').readFileSync(path.join(initSqlDir, 'init_computers.sql'), 'utf8');
        db.exec(initComputersSql, (execErr) => {
          if (execErr) {
            console.error('[init] computers 初始化失敗:', execErr);
          } else {
            console.log('[init] ✅ computers 表初始化成功');
          }
        });
      }
    });
  });
}

// 初始化數據庫
initializeDatabase();

// ✅ 自動�遷移：確保 passwordHash 欄位有預設值
db.serialize(() => {
  db.all("PRAGMA table_info(user_lists)", [], (err, columns) => {
    if (err) {
      console.error('檢查表結構失敗：', err)
      return
    }
    
    const hasPasswordHash = columns.some(col => col.name === 'passwordHash')
    
    if (hasPasswordHash) {
      // 檢查 passwordHash 是否有預設值
      const passwordHashCol = columns.find(col => col.name === 'passwordHash')
      if (!passwordHashCol.dflt_value) {
        // 需要更新欄位的預設值
        console.log('⚠️  更新 passwordHash 欄位預設值...')
        // SQLite 不直接支援 ALTER COLUMN，需要重建表
        db.run(`
          ALTER TABLE user_lists
          RENAME TO user_lists_old
        `, (renameErr) => {
          if (renameErr) {
            console.error('重命名表失敗：', renameErr)
            return
          }
          
          db.run(`
            CREATE TABLE user_lists (
              id              INTEGER PRIMARY KEY AUTOINCREMENT,
              username        TEXT NOT NULL UNIQUE,
              display_name    TEXT NOT NULL,
              email           TEXT NOT NULL,
              department      TEXT,
              ou              TEXT,
              ouname          TEXT,
              groupsname      TEXT,
              status          TEXT DEFAULT 'active'
                              CHECK(status IN ('active', 'locked', 'disabled')),
              last_login_at   TEXT,
              passwordHash    TEXT DEFAULT 'default123'
            )
          `, (createErr) => {
            if (createErr) {
              console.error('建立新表失敗：', createErr)
              return
            }
            
            db.run(`
              INSERT INTO user_lists
              SELECT id, username, display_name, email, department, ou, ouname, groupsname, status, last_login_at, 
                     COALESCE(passwordHash, 'default123')
              FROM user_lists_old
            `, (insertErr) => {
              if (insertErr) {
                console.error('遷移資料失敗：', insertErr)
                return
              }
              
              db.run(`DROP TABLE user_lists_old`, (dropErr) => {
                if (dropErr) {
                  console.error('刪除舊表失敗：', dropErr)
                } else {
                  console.log('✅ passwordHash 欄位遷移完成')
                }
              })
            })
          })
        })
      }
    }
  })
})

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


// 👥 群組管理 groups APIs
// 取得群組資訊
// ✅ 支援搜尋 ?q=（名稱 + 描述）
// ✅ 支援類型：
//    - ?type=all | security | distribution | security-global | security-domainlocal | security-universal
//    - 或 ?types=security-global,security-domainlocal,security-universal,distribution（多選）
app.get('/api/groups', (req, res) => {
  const { q = '', type = 'all' } = req.query

  const conditions = []
  const params = []

  if (q) {
    conditions.push('(groupname LIKE ? OR description LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }

  if (type && type !== 'all') {
    if (type === 'security') {
      conditions.push(`grouptype IN ('security-global','security-domainlocal','security-universal')`)
    } else {
      conditions.push(`grouptype = ?`)
      params.push(type)
    }
  }

  let sql = `
    SELECT id, groupname, description, grouptype
    FROM groups
  `
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`
  sql += ` ORDER BY groupname ASC`

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查詢 groups 錯誤：', err)
      return res.status(500).json({ success: false, message: '查詢群組清單失敗' })
    }
    return res.json({ success: true, data: rows })
  })
})

// 取得某群組底下的使用者清單（用 user_lists.groupsname）
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
      return res.status(500).json({ success: false, message: '查詢群組成員失敗' })
    }
    return res.json({ success: true, data: rows })
  })
})

// ✅ 建立群組
app.post('/api/groups', express.json(), (req, res) => {
  const { groupname, description = '', grouptype } = req.body || {}

  const name = String(groupname || '').trim()
  const desc = String(description || '').trim()
  const type = String(grouptype || '').trim()

  const allowedTypes = [
    'security-global',
    'security-domainlocal',
    'security-universal',
    'distribution',
  ]

  if (!name) return res.status(400).json({ success: false, message: '缺少群組名稱' })
  if (!type || !allowedTypes.includes(type)) {
    return res.status(400).json({ success: false, message: '不合法的群組類型' })
  }

  const sql = `
    INSERT INTO groups (groupname, description, grouptype)
    VALUES (?, ?, ?)
  `

  db.run(sql, [name, desc, type], function (err) {
    if (err) {
      console.error('建立 groups 失敗：', err)
      return res.status(400).json({ success: false, message: '建立失敗（可能群組名稱已存在）' })
    }

    return res.json({
      success: true,
      data: { id: this.lastID, groupname: name, description: desc, grouptype: type },
    })
  })
})

// ✅ 更新群組（可改名稱 / 描述 / 類型）
// 修改群組（含改名：同步更新 user_lists.groupsname）
app.patch('/api/groups/:id', express.json(), (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: '不合法的 id' })

  const { groupname, description, grouptype } = req.body || {}

  const allowedTypes = [
    'security-global',
    'security-domainlocal',
    'security-universal',
    'distribution',
  ]

  db.get(`SELECT * FROM groups WHERE id = ?`, [id], (err, g) => {
    if (err) {
      console.error('查詢 groups 失敗：', err)
      return res.status(500).json({ success: false, message: '伺服器錯誤' })
    }
    if (!g) return res.status(404).json({ success: false, message: '找不到群組' })

    const newName = groupname !== undefined ? String(groupname || '').trim() : g.groupname
    const newDesc = description !== undefined ? String(description || '').trim() : (g.description || '')
    const newType = grouptype !== undefined ? String(grouptype || '').trim() : g.grouptype

    if (!newName) return res.status(400).json({ success: false, message: '群組名稱不可為空' })
    if (!newType || !allowedTypes.includes(newType)) {
      return res.status(400).json({ success: false, message: '不合法的群組類型' })
    }

    // 若群組名稱有變更：同步更新 user_lists.groupsname 內的字串（逗號分隔）
    const oldName = g.groupname

    const updateGroupSql = `
      UPDATE groups
      SET groupname = ?, description = ?, grouptype = ?
      WHERE id = ?
    `

    db.run(updateGroupSql, [newName, newDesc, newType, id], function (uErr) {
      if (uErr) {
        console.error('更新 groups 失敗：', uErr)
        return res.status(400).json({ success: false, message: '更新失敗（可能群組名稱已存在）' })
      }

      // 同步 users 的 groupsname（只在改名時做）
      if (oldName !== newName) {
        const syncSql = `
          UPDATE user_lists
          SET groupsname = (
            SELECT TRIM(
              REPLACE(
                REPLACE(',' || IFNULL(groupsname, '') || ',', ',' || ? || ',', ',' || ? || ','),
                ',,', ','
              ),
              ','
            )
          )
          WHERE (',' || IFNULL(groupsname, '') || ',') LIKE '%,' || ? || ',%'
        `
        db.run(syncSql, [oldName, newName, oldName], (sErr) => {
          if (sErr) console.error('同步 user_lists.groupsname 失敗：', sErr)
          return res.json({ success: true, data: { id, groupname: newName, description: newDesc, grouptype: newType } })
        })
      } else {
        return res.json({ success: true, data: { id, groupname: newName, description: newDesc, grouptype: newType } })
      }
    })
  })
})

// ✅ 刪除群組 + 防呆（被 user_lists.groupsname 使用中不可刪）
app.delete('/api/groups/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: '不合法的 id' })

  db.get(`SELECT id, groupname FROM groups WHERE id = ?`, [id], (err, g) => {
    if (err) {
      console.error('查詢群組失敗：', err)
      return res.status(500).json({ success: false, message: '伺服器錯誤' })
    }
    if (!g) return res.status(404).json({ success: false, message: '找不到群組' })
    // 防呆：是否仍有使用者包含該群組
    const usedSql = `
      SELECT 1
      FROM user_lists
      WHERE (',' || IFNULL(groupsname, '') || ',') LIKE '%,' || ? || ',%'
      LIMIT 1
    `
    // 防呆：群組是否被 user_lists.groupsname 使用
    db.get(usedSql, [g.groupname], (uErr, used) => {
      if (uErr) {
        console.error('檢查群組使用狀態失敗：', uErr)
        return res.status(500).json({ success: false, message: '伺服器錯誤' })
      }
      if (used) {
        return res.status(400).json({ success: false, message: '此群組仍被使用者指派中，無法刪除' })
      }

      db.run(`DELETE FROM groups WHERE id = ?`, [id], (dErr) => {
        if (dErr) {
          console.error('刪除群組失敗：', dErr)
          return res.status(500).json({ success: false, message: '刪除失敗' })
        }
        return res.json({ success: true })
      })
    })
  })
})


// 🌲 組織單位管理 ous APIs
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
    SELECT id, ou_dn, ouname, description, parent_dn, parent_id, parentou
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
// ✅ 建立 OU：支援 root OU / child OU
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
          // UNIQUE ou_dn 可能衝突
          return res.status(400).json({ success: false, message: '建立失敗（可能 OU_DN 已存在）' })
        }

        return res.json({
          success: true,
          data: { id: this.lastID, ou_dn, ouname: parentName, description: desc, parent_dn: null, parentou: 0 },
        })
      })
    }

    // ---------- B) 建立 child OU（child 在 parent 底下） ----------
    // 先找父 OU（建議只找 root OU：parent_dn IS NULL）
    const findParentSql = `
      SELECT id, ou_dn, ouname
      FROM ous
      WHERE ouname = ? AND parent_dn IS NULL
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

      // child DN = OU=IT,OU=HeadOffice,DC=...
      const ou_dn = `OU=${childName},${parent.ou_dn}`
      const parent_dn = parent.ou_dn
      const parent_id = parent.id

      const insertChildSql = `
        INSERT INTO ous (ou_dn, ouname, description, parent_dn, parent_id, parentou)
        VALUES (?, ?, ?, ?, ?, 0)
      `
      db.run(insertChildSql, [ou_dn, childName, desc, parent_dn, parent_id], function (insErr) {
        if (insErr) {
          console.error('建立 child OU 失敗：', insErr)
          return res.status(400).json({ success: false, message: '建立失敗（可能 OU_DN 已存在）' })
        }

        // ✅ child 建立成功後，把父 OU 標記為「有子層」
        db.run(`UPDATE ous SET parentou = 1 WHERE id = ?`, [parent.id], (uErr) => {
          if (uErr) console.error('更新父 OU parentou 失敗：', uErr)
          return res.json({
            success: true,
            data: { id: this.lastID, ou_dn, ouname: childName, description: desc, parent_dn, parent_id, parentou: 0 },
          })
        })
      })
    })
  })
})

// ✅ 更新 OU：不只改 description，也能改 parent_dn / parentou
// PATCH /api/ous/:id
// 更新 OU：支援 ouname、ou_dn、description、parent_dn、parentou 欄位
app.patch('/api/ous/:id', (req, res) => {
  const id = Number(req.params.id)
  const { ouname, ou_dn, description, parent_dn, parentou } = req.body

  db.get(`SELECT dc_dn FROM adsettings LIMIT 1`, [], (err, setting) => {
    if (err) return res.status(500).json({ success: false, message: '讀取系統設定失敗' })
    if (!setting?.dc_dn) return res.status(400).json({ success: false, message: '尚未設定 DC DN' })

    db.get(`SELECT * FROM ous WHERE id = ?`, [id], (err2, ou) => {
      if (err2 || !ou) return res.status(404).json({ success: false, message: '找不到 OU' })

      const dcDn = setting.dc_dn
      const newOuname = (ouname ?? ou.ouname).trim()
      let newOuDn = ou_dn ?? null
      let newParentDn = parent_dn !== undefined ? parent_dn : ou.parent_dn
      let newParentou = parentou !== undefined ? parentou : ou.parentou
      let newParentId = null

      // ✅ 定義 performUpdate 函數（必須在調用之前定義）
      function performUpdate() {
        // 如果前端傳來 ou_dn，使用前端的值；否則計算
        if (ou_dn) {
          newOuDn = ou_dn
        } else {
          newOuDn = `OU=${newOuname},${dcDn}`
          if (newParentDn) {
            newOuDn = `OU=${newOuname},${newParentDn}`
          }
        }

        const sql = `
          UPDATE ous
          SET ouname = ?,
              ou_dn = ?,
              parent_dn = ?,
              parent_id = ?,
              parentou = ?,
              description = ?
          WHERE id = ?
        `
        
        db.run(sql, [
          newOuname,
          newOuDn,
          newParentDn,
          newParentId,
          newParentou,
          (description ?? ou.description),
          id
        ], function (err3) {
          if (err3) {
            console.error('更新 OU 失敗：', err3)
            return res.status(500).json({ success: false, message: '更新失敗（可能 DN 重複）' })
          }

          // ✅ 遞迴更新所有子孫 OU 的 ou_dn 和 parent_dn
          // oldOuDn: 更新前的 OU DN（用於查找子 OU）
          // newOuDn: 更新後的 OU DN（用於生成子 OU 的新 DN）
          const updateDescendants = (oldOuDn, newOuDn, callback) => {
            db.all(
              `SELECT id, ouname, ou_dn FROM ous WHERE parent_dn = ?`,
              [oldOuDn],
              (cErr, children) => {
                if (cErr) {
                  console.error('查詢子 OU 失敗：', cErr)
                  return callback(cErr)
                }
                
                if (!children || children.length === 0) {
                  return callback(null)
                }

                let completed = 0
                const total = children.length

                children.forEach(child => {
                  const childOldOuDn = child.ou_dn
                  const childNewOuDn = `OU=${child.ouname},${newOuDn}`
                  
                  db.run(
                    `UPDATE ous SET ou_dn = ?, parent_dn = ? WHERE id = ?`,
                    [childNewOuDn, newOuDn, child.id],
                    (uErr) => {
                      if (uErr) {
                        console.error('更新子 OU 失敗：', uErr)
                        completed++
                        if (completed === total) {
                          callback(null)
                        }
                      } else {
                        // 遞迴更新此子 OU 的後代（用舊DN查找，用新DN生成）
                        updateDescendants(childOldOuDn, childNewOuDn, (descErr) => {
                          if (descErr) {
                            console.error('遞迴更新子孫 OU 失敗：', descErr)
                          }
                          completed++
                          if (completed === total) {
                            callback(null)
                          }
                        })
                      }
                    }
                  )
                })
              }
            )
          }

          // 如果 OU_DN 有變化，遞迴更新所有子孫
          if (ou.ou_dn !== newOuDn) {
            updateDescendants(ou.ou_dn, newOuDn, (descErr) => {
              if (descErr) {
                console.error('更新子孫 OU 失敗：', descErr)
              }
              
              // 繼續處理父 OU 的 parentou 狀態更新
              handleParentOuUpdates()
            })
          } else {
            handleParentOuUpdates()
          }

          function handleParentOuUpdates() {
            // 若原本的父 OU 變更了，需要更新舊父 OU 的 parentou 狀態
            if (ou.parent_dn && ou.parent_dn !== newParentDn) {
              // 檢查舊父 OU 是否還有其他子層
              db.get(
                `SELECT COUNT(*) as cnt FROM ous WHERE parent_dn = ? AND id != ?`,
                [ou.parent_dn, id],
                (cErr, cRes) => {
                  if (!cErr && cRes?.cnt === 0) {
                    // 舊父 OU 沒有子層了，將其 parentou 改回 0
                    db.run(
                      `UPDATE ous SET parentou = 0 WHERE ou_dn = ?`,
                      [ou.parent_dn],
                      (uErr) => {
                        if (uErr) console.error('更新舊父 OU parentou 失敗：', uErr)
                      }
                    )
                  }
                }
              )
            }

            // 若新增了父層關係，確保新父 OU 的 parentou = 1
            if (newParentDn && (!ou.parent_dn || ou.parent_dn !== newParentDn)) {
              db.run(
                `UPDATE ous SET parentou = 1 WHERE ou_dn = ?`,
                [newParentDn],
                (pErr) => {
                  if (pErr) console.error('更新新父 OU parentou 失敗：', pErr)
                }
              )
            }

            res.json({ 
              success: true, 
              data: { 
                id, 
                ouname: newOuname, 
                ou_dn: newOuDn, 
                parent_dn: newParentDn,
                parent_id: newParentId,
                parentou: newParentou 
              } 
            })
          }
        })
      }

      // 查找 parent_id（如果有 parent_dn），然後調用 performUpdate
      if (newParentDn) {
        db.get(
          `SELECT id FROM ous WHERE ou_dn = ?`,
          [newParentDn],
          (pErr, parent) => {
            if (!pErr && parent) {
              newParentId = parent.id
            }
            performUpdate()
          }
        )
      } else {
        performUpdate()
      }
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


// 👥 使用者管理 user_lists APIs
// 👥 取得所有使用者清單
app.get('/api/users', (req, res) => {
  const sql = `
    SELECT
      u.id,                -- 👈 新增：返回 id，供刪除/修改時使用
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

// ✅ 建立使用者
app.post('/api/users', express.json(), (req, res) => {
  const { username, display_name, email, department, ou, groupsname, status = 'active', passwordHash = 'default123' } = req.body

  if (!username || !display_name || !email) {
    return res.status(400).json({ success: false, message: '缺少帳號、顯示名稱或 Email' })
  }

  // ✅ 如果有提供 ou（ou_dn），查詢對應的 ouname
  if (ou) {
    db.get('SELECT ouname FROM ous WHERE ou_dn = ?', [ou], (err, ouRow) => {
      if (err) {
        console.error('查詢 OU 名稱失敗：', err)
        return res.status(500).json({ success: false, message: '查詢 OU 名稱失敗' })
      }

      const ouname = ouRow?.ouname || null

      const sql = `
        INSERT INTO user_lists (username, display_name, email, department, ou, ouname, groupsname, status, passwordHash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      db.run(sql, [username, display_name, email, department || null, ou, ouname, groupsname || null, status, passwordHash], function (err) {
        if (err) {
          console.error('新增使用者失敗：', err)
          return res.status(400).json({ success: false, message: '新增失敗（可能帳號已存在）' })
        }

        return res.json({
          success: true,
          data: { id: this.lastID, username, display_name, email, department, ou, ouname, groupsname, status }
        })
      })
    })
  } else {
    // ✅ 沒有提供 ou，直接新增
    const sql = `
      INSERT INTO user_lists (username, display_name, email, department, ou, ouname, groupsname, status, passwordHash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    db.run(sql, [username, display_name, email, department || null, null, null, groupsname || null, status, passwordHash], function (err) {
      if (err) {
        console.error('新增使用者失敗：', err)
        return res.status(400).json({ success: false, message: '新增失敗（可能帳號已存在）' })
      }

      return res.json({
        success: true,
        data: { id: this.lastID, username, display_name, email, department, ou: null, ouname: null, groupsname, status }
      })
    })
  }
})

// ✅ 更新使用者資訊
app.patch('/api/users/:id', express.json(), (req, res) => {
  const id = Number(req.params.id)
  const { username, display_name, email, department, ou, groupsname, status } = req.body

  // ✅ 如果更新了 ou，需要同步查詢並更新 ouname
  if (ou !== undefined) {
    // ou 可能是 null（清空）或具體的 ou_dn
    if (ou === null) {
      // 清空 OU
      const fields = []
      const params = []

      const setIf = (k, v) => {
        if (v !== undefined) { fields.push(`${k} = ?`); params.push(v) }
      }

      setIf('username', username)
      setIf('display_name', display_name)
      setIf('email', email)
      setIf('department', department)
      setIf('ou', null)
      setIf('ouname', null)
      setIf('groupsname', groupsname)
      setIf('status', status)

      if (!fields.length) return res.json({ success: true })

      params.push(id)

      const sql = `UPDATE user_lists SET ${fields.join(', ')} WHERE id = ?`

      db.run(sql, params, function (err) {
        if (err) {
          console.error('更新使用者失敗：', err)
          return res.status(400).json({ success: false, message: '更新失敗（可能帳號已存在）' })
        }

        return res.json({ success: true })
      })
    } else {
      // 查詢 ouname
      db.get('SELECT ouname FROM ous WHERE ou_dn = ?', [ou], (err, ouRow) => {
        if (err) {
          console.error('查詢 OU 名稱失敗：', err)
          return res.status(500).json({ success: false, message: '查詢 OU 名稱失敗' })
        }

        const ouname = ouRow?.ouname || null

        const fields = []
        const params = []

        const setIf = (k, v) => {
          if (v !== undefined) { fields.push(`${k} = ?`); params.push(v) }
        }

        setIf('username', username)
        setIf('display_name', display_name)
        setIf('email', email)
        setIf('department', department)
        setIf('ou', ou)
        setIf('ouname', ouname)
        setIf('groupsname', groupsname)
        setIf('status', status)

        if (!fields.length) return res.json({ success: true })

        params.push(id)

        const sql = `UPDATE user_lists SET ${fields.join(', ')} WHERE id = ?`

        db.run(sql, params, function (err) {
          if (err) {
            console.error('更新使用者失敗：', err)
            return res.status(400).json({ success: false, message: '更新失敗（可能帳號已存在）' })
          }

          return res.json({ success: true })
        })
      })
    }
  } else {
    // 沒有更新 ou，正常更新其他欄位
    const fields = []
    const params = []

    const setIf = (k, v) => {
      if (v !== undefined) { fields.push(`${k} = ?`); params.push(v) }
    }

    setIf('username', username)
    setIf('display_name', display_name)
    setIf('email', email)
    setIf('department', department)
    setIf('groupsname', groupsname)
    setIf('status', status)

    if (!fields.length) return res.json({ success: true })

    params.push(id)

    const sql = `UPDATE user_lists SET ${fields.join(', ')} WHERE id = ?`

    db.run(sql, params, function (err) {
      if (err) {
        console.error('更新使用者失敗：', err)
        return res.status(400).json({ success: false, message: '更新失敗（可能帳號已存在）' })
      }

      return res.json({ success: true })
    })
  }
})

// ✅ 解鎖使用者（專門的解鎖端點，要放在通用 PATCH 前面）
app.patch('/api/users/:id/unlock', express.json(), (req, res) => {
  const id = Number(req.params.id)

  const sql = `
    UPDATE user_lists
    SET status = 'active'
    WHERE id = ?
  `

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('解鎖使用者失敗：', err)
      return res.status(500).json({ success: false, message: '解鎖失敗' })
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '找不到使用者' })
    }

    return res.json({ success: true })
  })
})

// ✅ 刪除使用者
app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id)

  db.run(`DELETE FROM user_lists WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('刪除使用者失敗：', err)
      return res.status(500).json({ success: false, message: '刪除失敗' })
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '找不到使用者' })
    }

    return res.json({ success: true })
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


// 🖥️ 電腦管理 computers APIs
// GET /api/computers
// ✅ 支援搜尋 ?q=（電腦名稱 / OS）
// ✅ 支援過濾 ?domain= / ?conn= / ?acc=
app.get('/api/computers', (req, res) => {
  const { q = '', domain = '', conn = '', acc = '' } = req.query

  const conditions = []
  const params = []

  if (q) {
    conditions.push('(cpname LIKE ? OR os LIKE ? OR ouname LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (domain) {
    conditions.push('DomainMembershipStatus = ?')
    params.push(domain)
  }
  if (conn) {
    conditions.push('ConnectivityStatus = ?')
    params.push(conn)
  }
  if (acc) {
    conditions.push('ComputerAccount_inADStatus = ?')
    params.push(acc)
  }

  let sql = `
    SELECT id, cpname, os, ouname, ou_id,
           DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus
    FROM computers
  `

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY cpname ASC'

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查詢 computers 錯誤：', err)
      return res.status(500).json({ success: false, message: '查詢電腦清單失敗' })
    }
    return res.json({ success: true, data: rows })
  })
})

// POST /api/computers
// ✅ 建立電腦
app.post('/api/computers', express.json(), (req, res) => {
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
    (cpname, os, ouname, ou_id, DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  db.run(sql, [
    cpname, os, ouname, ou_id,
    DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus
  ], function (err) {
    if (err) {
      console.error('新增 computer 失敗：', err)
      return res.status(400).json({ success: false, message: '新增失敗（可能 cpname 重複）' })
    }
    return res.json({
      success: true,
      data: { id: this.lastID, cpname, os, ouname, ou_id, DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus }
    })
  })
})

// PATCH /api/computers/:id
// ✅ 更新電腦
app.patch('/api/computers/:id', express.json(), (req, res) => {
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

  params.push(id)

  const sql = `UPDATE computers SET ${fields.join(', ')} WHERE id = ?`

  db.run(sql, params, function (err) {
    if (err) {
      console.error('更新 computer 失敗：', err)
      return res.status(400).json({ success: false, message: '更新失敗（可能 cpname 重複）' })
    }
    return res.json({ success: true })
  })
})

// DELETE /api/computers/:id
// ✅ 刪除電腦
app.delete('/api/computers/:id', (req, res) => {
  const id = Number(req.params.id)
  db.run(`DELETE FROM computers WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('刪除 computer 失敗：', err)
      return res.status(500).json({ success: false, message: '刪除失敗' })
    }
    return res.json({ success: true })
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

  // ✅ 先取得舊的 dc_dn，用於更新 ous 資料表
  db.get('SELECT dc_dn FROM adsettings WHERE id = ?', [s.id ?? 1], (err, oldSettings) => {
    if (err) {
      console.error('查詢舊設定錯誤：', err)
      return res.status(500).json({
        success: false,
        message: '查詢舊設定失敗'
      })
    }

    const oldDcDn = oldSettings?.dc_dn || ''
    const newDcDn = s.dc_dn || ''

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

      // ✅ 如果 dc_dn 有變更，同步更新 ous 資料表
      if (oldDcDn && newDcDn && oldDcDn !== newDcDn) {
        console.log(`🔄 DC 變更：${oldDcDn} → ${newDcDn}，正在更新 ous 資料表...`)

        // 更新所有 OU 的 ou_dn
        db.run(
          `UPDATE ous SET ou_dn = REPLACE(ou_dn, ?, ?) WHERE ou_dn LIKE ?`,
          [oldDcDn, newDcDn, `%${oldDcDn}`],
          function (ouDnErr) {
            if (ouDnErr) {
              console.error('更新 ou_dn 錯誤：', ouDnErr)
            } else {
              console.log(`✅ 已更新 ${this.changes} 筆 ou_dn`)
            }

            // 更新所有 OU 的 parent_dn
            db.run(
              `UPDATE ous SET parent_dn = REPLACE(parent_dn, ?, ?) WHERE parent_dn LIKE ?`,
              [oldDcDn, newDcDn, `%${oldDcDn}`],
              function (parentDnErr) {
                if (parentDnErr) {
                  console.error('更新 parent_dn 錯誤：', parentDnErr)
                } else {
                  console.log(`✅ 已更新 ${this.changes} 筆 parent_dn`)
                }

                return res.json({ success: true })
              }
            )
          }
        )
      } else {
        return res.json({ success: true })
      }
    })
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