PRAGMA foreign_keys = OFF;

-- 刪除舊表
DROP TABLE IF EXISTS user_lists;

-- 建立新的 user_lists 資料表
-- ou 欄位會參照 ous.ou_dn
CREATE TABLE IF NOT EXISTS user_lists (
    username TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT,
    ou TEXT,   -- 參照 ous.ou_dn
    groupsname TEXT,      -- 群組清單，多個群組以逗號分隔儲存
    password_hash TEXT,   -- 目前先存假資料，之後可改為真正 hash
    status TEXT CHECK(status IN ('active', 'locked', 'disabled'))
           NOT NULL DEFAULT 'active',
    last_login_at TEXT,
    CONSTRAINT fk_user_ou FOREIGN KEY (ou)
        REFERENCES ous (ou_dn)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- 匯入假資料（記得先執行 init_ous.sql 才能套用 FK）
INSERT INTO user_lists
    (username, display_name, email, department, ou, groupsname, password_hash, status, last_login_at)
VALUES
    ('luliya', 'Luliya Xiao', 'luliya@example.com', '資訊部',
     'OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',
     'IT_Admins,Hospital_Staff_All',
     'AD0227',   -- 目前先放明碼，之後可改 hash
     'active', '2025-11-30 09:15'),

    ('adadmin', 'AD 管理員', 'admin@example.com', '資訊部',
     'OU=IT-Admin,OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',
     'IT_Admins',
     'ADADMIN123!',
     'active', '2025-12-01 14:02'),

    ('nurse001', '護理師 001', 'n001@example.com', '護理部',
     'OU=Nursing,OU=HeadOffice,DC=corp,DC=example,DC=com',
     'Nursing_Staff,Hospital_Staff_All',
     'NURSE001!',
     'active', '2025-11-29 08:10'),

    ('doctor001', '醫師 A', 'd001@example.com', '醫師',
     'OU=Doctors,OU=Clinic,OU=HeadOffice,DC=corp,DC=example,DC=com',
     'Doctors_All,Hospital_Staff_All',
     'DOCTOR001!',
     'active', '2025-11-27 10:00'),

    ('lab001', '檢驗師 B', 'lab001@example.com', '檢驗科',
     'OU=Lab,OU=Clinic,OU=HeadOffice,DC=corp,DC=example,DC=com',
     'Lab_Staff,Hospital_Staff_All',
     'LAB001!',
     'active', '2025-11-27 10:00'),

    -- 無 OU / 無群組的使用者：測試 ON DELETE SET NULL 或 JOIN NULL 狀況
    ('temp001', '臨時人員 001', 'temp001@example.com', '臨時部門',
     NULL,
     NULL,
     'TEMP001!',
     'active', '2025-11-15 13:22');

PRAGMA foreign_keys = ON;