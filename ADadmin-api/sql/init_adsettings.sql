PRAGMA foreign_keys = OFF;

-- 如果已存在就重建
DROP TABLE IF EXISTS adsettings;

-- AD 系統設定：adsettings
CREATE TABLE IF NOT EXISTS adsettings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- AD 管理後台 - 使用設定
    companyname       TEXT NOT NULL,  -- 自訂公司名稱
    teamname          TEXT NOT NULL,  -- 自訂部門單位名稱
    syslogo           TEXT,           -- 系統 LOGO 檔案路徑或 URL
    sysbackgroundimg  TEXT,           -- 系統背景圖 檔案路徑或 URL

    -- 最高權限登入設定
    sysaccount        TEXT NOT NULL,  -- 自訂系統帳號
    syspasswd         TEXT NOT NULL,  -- 自訂系統密碼（之後可改成 hash）

    -- 網域中的 DC 設定
    domainname        TEXT NOT NULL,  -- 網域名稱
    dc_dn             TEXT NOT NULL,  -- DN 識別名稱

    -- 網路連線設定
    ip                TEXT NOT NULL,  -- IP 位置
    subnetmask        TEXT NOT NULL,  -- 子網路遮罩
    defaultgateway    TEXT NOT NULL,  -- 預設閘道
    preferredDNSserver TEXT NOT NULL, -- 慣用 DNS 伺服器
    secondaryDNSserver TEXT           -- 其他 DNS 伺服器（可空）
);

-- 預設一筆設定（之後可以改成實際環境）
INSERT INTO adsettings (
    companyname,
    teamname,
    syslogo,
    sysbackgroundimg,
    sysaccount,
    syspasswd,
    domainname,
    dc_dn,
    ip,
    subnetmask,
    defaultgateway,
    preferredDNSserver,
    secondaryDNSserver
) VALUES (
    'XXX公司',
    '資訊單位',
    NULL,
    NULL,
    'adadmin',
    'ADADMIN123!',
    'corp.example.com',
    'DC=corp,DC=example,DC=com',
    '192.168.1.10',
    '255.255.255.0',
    '192.168.1.254',
    '8.8.8.8',
    '8.8.4.4'
);

PRAGMA foreign_keys = ON;
