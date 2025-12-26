PRAGMA foreign_keys = OFF;

-- 如果已存在就重建 ous 資料表
DROP TABLE IF EXISTS ous;

-- 建立 ous 資料表
-- ou_dn 為完整的 OU DN，且唯一
-- parent_id 為父 OU 的 id，用來建立 OU 樹狀結構
CREATE TABLE IF NOT EXISTS ous (
  id           INTEGER PRIMARY KEY,                    -- 假資料用 1,2,3... 這裡用 INTEGER 最合理
  ou_dn        TEXT NOT NULL UNIQUE,                   -- 完整 DN
  ouname       TEXT NOT NULL,                          -- OU 名稱
  description  TEXT,                                   -- OU 別名(部門)

  parentou     INTEGER NOT NULL DEFAULT 0 CHECK(parentou IN (0, 1)),  -- 0/1：是否啟用子層(有上層 OU)，0=無子層(葉節點)，1=有子層(父節點)
  parent_dn    TEXT NULL,                              -- 父 OU DN（INSERT 有用到）
  parent_id    INTEGER NULL,                           -- 父 OU id（用來建樹）

  created_at   TEXT NOT NULL DEFAULT (datetime('now')),-- 建立時間
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),-- 更新時間

  FOREIGN KEY(parent_id) REFERENCES ous(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ous_parent_id ON ous(parent_id);
CREATE INDEX IF NOT EXISTS idx_ous_ouname ON ous(ouname);

-- updated_at 自動更新（避免遞迴）
CREATE TRIGGER IF NOT EXISTS trg_ous_updated_at
AFTER UPDATE ON ous
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE ous SET updated_at = datetime('now') WHERE id = OLD.id;
END;

PRAGMA foreign_keys = ON;

-- ===== Root OU =====
INSERT INTO ous (id, ou_dn, ouname, description, parentou, parent_id, parent_dn)
VALUES
(1, 'OU=HeadOffice,DC=corp,DC=example,DC=com', 'HeadOffice', '總院總部', 1, NULL, NULL),
(10, 'OU=test0,DC=corp,DC=example,DC=com', 'test0', 'test0', 1, NULL, NULL),
(13, 'OU=000,DC=corp,DC=example,DC=com', '000', '000', 0, NULL, NULL),
(14, 'OU=111,DC=corp,DC=example,DC=com', '111', '111', 0, NULL, NULL),
(15, 'OU=222,DC=corp,DC=example,DC=com', '222', '222', 0, NULL, NULL);

-- ===== Level 1 =====
INSERT INTO ous (id, ou_dn, ouname, description, parentou, parent_id, parent_dn)
VALUES
(2, 'OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com', 'Outpatient', '門診單位', 1, 1, 'OU=HeadOffice,DC=corp,DC=example,DC=com'),
(3, 'OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',        'IT',        '資訊部',     1, 1, 'OU=HeadOffice,DC=corp,DC=example,DC=com'),
(4, 'OU=Nursing,OU=HeadOffice,DC=corp,DC=example,DC=com',   'Nursing',   '護理部',     1, 1, 'OU=HeadOffice,DC=corp,DC=example,DC=com'),
(11, 'OU=test1,OU=test0,DC=corp,DC=example,DC=com', 'test1', 'test1', 1, 10, 'OU=test0,DC=corp,DC=example,DC=com');

-- ===== Level 2 - test =====
INSERT INTO ous (id, ou_dn, ouname, description, parentou, parent_id, parent_dn)
VALUES
(12, 'OU=test2,OU=test1,OU=test0,DC=corp,DC=example,DC=com', 'test2', 'test2', 0, 11, 'OU=test1,OU=test0,DC=corp,DC=example,DC=com');

-- ===== Level 2 - 門診單位 =====
INSERT INTO ous (id, ou_dn, ouname, description, parentou, parent_id, parent_dn)
VALUES
(5, 'OU=Laboratory,OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com', 'Laboratory', '檢驗科',   0, 2, 'OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com'),
(6, 'OU=Doctors,OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com',    'Doctors',    '醫師群組', 0, 2, 'OU=Outpatient,OU=HeadOffice,DC=corp,DC=example,DC=com');

-- ===== Level 2 - 資訊部 =====
INSERT INTO ous (id, ou_dn, ouname, description, parentou, parent_id, parent_dn)
VALUES
(7, 'OU=SysAdmin,OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',  'SysAdmin', '系統管理組', 0, 3, 'OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com'),
(8, 'OU=Network,OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',   'Network', '網路組',     0, 3, 'OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com');

-- ===== Level 2 - 人事部 =====
INSERT INTO ous (id, ou_dn, ouname, description, parentou, parent_id, parent_dn)
VALUES
(9, 'OU=HR,OU=HeadOffice,DC=corp,DC=example,DC=com',  'HR', '人事部', 0, 1, 'OU=HeadOffice,DC=corp,DC=example,DC=com');