-- groups.sql
-- 群組資料表（含 id 主鍵）
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
