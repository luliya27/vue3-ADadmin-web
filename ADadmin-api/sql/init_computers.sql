-- 如果已存在就重建 computers 資料表
DROP TABLE IF EXISTS computers;

-- 建立 computers 資料表
CREATE TABLE IF NOT EXISTS computers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 自動編號 ID
  cpname TEXT NOT NULL UNIQUE,           -- 電腦名稱
  os TEXT NOT NULL,                      -- OS
  ouname TEXT,                           -- 所屬 OU（ous.ouname 關聯）
  ou_id INTEGER,                         -- (建議) 對應 ous.id，未來更穩

  DomainMembershipStatus TEXT NOT NULL CHECK ( -- 電腦網域成員狀態
    DomainMembershipStatus IN ('Joined','LeftDomain','NotJoined')
  ) DEFAULT 'NotJoined',

  ConnectivityStatus TEXT NOT NULL CHECK ( -- 電腦連線狀態
    ConnectivityStatus IN ('Online','Offline','LockedOut')
  ) DEFAULT 'Offline',

  ComputerAccount_inADStatus TEXT NOT NULL CHECK ( -- 電腦帳號在 AD 中狀態
    ComputerAccount_inADStatus IN ('Enabled','Disabled','Unused')
  ) DEFAULT 'Unused',
created_at TEXT NOT NULL DEFAULT (datetime('now')),    -- 建立時間
updated_at TEXT NOT NULL DEFAULT (datetime('now'))    -- 更新時間
);

-- 假資料（ouname 需對得上 ous.ouname）
INSERT INTO computers
(cpname, os, ouname, ou_id, DomainMembershipStatus, ConnectivityStatus, ComputerAccount_inADStatus)
VALUES
('IT-PC-001', 'Windows 11 Pro', 'IT', 3, 'Joined', 'Online', 'Enabled'),
('IT-PC-002', 'Windows 10 Pro', 'IT', 3, 'Joined', 'Offline', 'Enabled'),
('NURSE-WS-01', 'Windows 10 Enterprise', 'Nursing', 4, 'Joined', 'Online', 'Enabled'),
('OPD-KIOSK-01', 'Windows 10 IoT', 'Outpatient', 2, 'Joined', 'Online', 'Unused'),
('LAB-PC-01', 'Windows 11 Pro', 'Laboratory', 5, 'Joined', 'LockedOut', 'Disabled'),
('TEMP-WS-01', 'Windows 10 Pro', NULL, NULL, 'NotJoined', 'Offline', 'Unused');