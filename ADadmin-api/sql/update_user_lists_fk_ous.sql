PRAGMA foreign_keys = OFF;

-- 1. 建立新版本 user_lists，ou 欄位參考 ous(ou_dn)
CREATE TABLE user_lists_new (
    username TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT,
    ou TEXT,  -- 對應 ous.ou_dn
    status TEXT CHECK(status IN ('active', 'locked', 'disabled')) NOT NULL DEFAULT 'active',
    last_login_at TEXT,
    CONSTRAINT fk_user_ou
      FOREIGN KEY (ou)
      REFERENCES ous (ou_dn)
      ON UPDATE CASCADE
      ON DELETE SET NULL
);

-- 2. 將舊資料搬過來
INSERT INTO user_lists_new (username, display_name, email, department, ou, status, last_login_at)
SELECT username, display_name, email, department, ou, status, last_login_at
FROM user_lists;

-- 3. 刪除舊表並改名
DROP TABLE user_lists;
ALTER TABLE user_lists_new RENAME TO user_lists;

PRAGMA foreign_keys = ON;
