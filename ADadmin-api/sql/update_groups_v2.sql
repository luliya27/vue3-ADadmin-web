PRAGMA foreign_keys = off;

-- 1. 建立新版 groups 表（groupname 取代 id）
CREATE TABLE groups_new (
    groupname TEXT PRIMARY KEY,
    description TEXT,
    type TEXT CHECK(type IN ('security', 'distribution', 'org', 'other'))
         NOT NULL DEFAULT 'security'
);

-- 2. 把舊資料搬到新表
INSERT INTO groups_new (groupname, description, type)
SELECT name, description, type
FROM groups;

-- 3. 刪除舊表
DROP TABLE groups;

-- 4. 將新表改名為 groups
ALTER TABLE groups_new RENAME TO groups;

PRAGMA foreign_keys = on;
