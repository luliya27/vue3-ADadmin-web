-- =========================
-- init_user_lists.sql
-- user_lists：使用者管理（新版欄位）
-- =========================
PRAGMA foreign_keys = OFF;

-- 如果已存在就重建 user_lists
DROP TABLE IF EXISTS user_lists;
-- 建立 user_lists 資料表
CREATE TABLE IF NOT EXISTS user_lists (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  email           TEXT NOT NULL,
  department      TEXT, -- 部門描述（例如：資訊部、護理部）
  ou              TEXT, -- OU 的 DN（例如：OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com）
  ouname          TEXT, -- OU 名稱（例如：IT、Nursing）
  groupsname      TEXT, -- 多群組用逗號字串，例如 "IT_Admins,Hospital_Staff_All"
  status          TEXT DEFAULT 'active'
                  CHECK(status IN ('active', 'locked', 'disabled')),
  last_login_at   TEXT, -- SQLite 用 TEXT 儲存時間即可 (YYYY-MM-DD HH:MM:SS)
  passwordHash    TEXT NOT NULL -- 密碼（目前先明碼/或 hash）
);

-- 建議索引（列表搜尋用）
CREATE INDEX IF NOT EXISTS idx_user_lists_username ON user_lists(username);
CREATE INDEX IF NOT EXISTS idx_user_lists_ou ON user_lists(ou);
CREATE INDEX IF NOT EXISTS idx_user_lists_department ON user_lists(department);
CREATE INDEX IF NOT EXISTS idx_user_lists_status ON user_lists(status);

PRAGMA foreign_keys = ON;
-- =========================
-- 假資料（需與 ous 的 ouname/description 對得上）
-- 例：ous.ouname = IT / HeadOffice / Outpatient / Nursing / Laboratory / Doctors
--     ous.description = 資訊部 / 醫院總院總部 / 門診單位 / 護理部 / 檢驗科 / 醫師群組
-- =========================

INSERT INTO user_lists
(username, display_name, email, department, ou, ouname, groupsname, status, last_login_at, passwordHash)
VALUES
-- 測試帳號：luliya / AD0227
('luliya', 'Luliya Xiao', 'luliya@example.com',
 '資訊部', 'OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com', 'IT',
 'IT_Admins,Hospital_Staff_All',
 'active', '2025-12-17 10:20:00', 'AD0227'),

-- 最高權限帳號（之後你會改成讀 adsettings 也可）
('adadmin', 'AD 管理員', 'adadmin@example.com',
 '資訊部', 'OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com', 'IT',
 'IT_Admins',
 'active', '2025-12-01 14:02:00', 'ADADMIN123!'),

('nurse001', '護理師001', 'nurse001@example.com',
 '護理部', 'OU=Nursing,OU=HeadOffice,DC=corp,DC=example,DC=com', 'Nursing',
 'Nursing_Staff,Hospital_Staff_All',
 'active', '2025-11-29 08:10:00', 'NURSE001!'),

('doctor001', '醫師001', 'doctor001@example.com',
 '醫師群組', 'OU=Doctors,OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com', 'Doctors',
 'Doctors_All,Hospital_Staff_All',
 'active', '2025-11-27 10:00:00', 'DOCTOR001!'),

('lab001', '檢驗師001', 'lab001@example.com',
 '檢驗科', 'OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com', 'Laboratory',
 'Lab_Staff,Hospital_Staff_All',
 'active', '2025-11-27 10:00:00', 'LAB001!'),

('temp001', '臨時人員001', 'temp001@example.com',
 NULL, NULL, NULL,
 'Temp_Staff',
 'active', '2025-11-15 13:22:00', 'TEMP001!'),

-- 狀態示範：locked / disabled
('locked001', '鎖定帳號001', 'locked001@example.com',
 '門診單位', 'OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com', 'Outpatient',
 'Hospital_Staff_All',
 'locked', '2025-11-20 09:30:00', 'LOCKED001!'),

('disabled001', '停用帳號001', 'disabled001@example.com',
 '門診單位', 'OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com', 'Outpatient',
 'Hospital_Staff_All',
 'disabled', '2025-10-05 12:00:00', 'DISABLED001!');