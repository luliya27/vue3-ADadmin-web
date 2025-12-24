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
    SELECT
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

// 取得群組資訊
// 支援簡單搜尋 ?q= 關鍵字（名稱 + 描述）, ?type=security|distribution
// 注：type='security' 會匹配所有 security-* 類型
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
// 支援 ?q= 關鍵字（ouname / description / ou_dn）
app.get('/api/ous', (req, res) => {
  const { q } = req.query

  const conditions = []
  const params = []

  if (q) {
    conditions.push('(ouname LIKE ? OR description LIKE ? OR ou_dn LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }

  let sql = `
    SELECT ou_dn, ouname, description, ou_type
    FROM ous
  `

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY ou_dn'

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查詢 ous 錯誤：', err)
      return res.status(500).json({
        success: false,
        message: '查詢組織單位失敗',
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
        data: {
          id: 1,
          companyname: '',
          teamname: '',
          syslogo: '',
          sysbackgroundimg: '',
          sysaccount: '',
          syspasswd: '',
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