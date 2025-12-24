-- 重新建立 groups 資料表
-- 群組資料表（新版）
DROP TABLE IF EXISTS groups;
-- grouptype 限定為：
--  security-global / security-domainlocal / security-universal / distribution
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupname TEXT NOT NULL UNIQUE,
  description TEXT,
  grouptype TEXT NOT NULL
    CHECK (grouptype IN (
      'security-global',
      'security-domainlocal',
      'security-universal',
      'distribution'
    ))
);

-- 建議索引（搜尋用）
CREATE INDEX IF NOT EXISTS idx_groups_groupname ON groups(groupname);
CREATE INDEX IF NOT EXISTS idx_groups_grouptype ON groups(grouptype);

-- 假資料（可依之後實際 AD 調整）
INSERT INTO groups (groupname, description, grouptype)
VALUES
  ('IT_Admins',
   '資訊部系統管理員群組',
   'security-global'),

  ('Temp_Staff',
   '臨時人員、工讀生相關權限群組',
   'security-domainlocal'),

  ('Hospital_Staff_All',
   '全院員工共同權限群組',
   'security-universal'),

  ('Doctors_All',
   '全院醫師廣播通訊群組',
   'distribution'),

  ('HR_Announcement',
   '人資公告用通訊群組',
   'distribution');