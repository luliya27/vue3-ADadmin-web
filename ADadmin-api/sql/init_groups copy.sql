-- 重新建立 groups 資料表
DROP TABLE IF EXISTS groups;

-- 資料表：groups
--  ├─ 群組名稱：groupname      （主鍵）
--  ├─ 群組描述：description
--  └─ 群組類型：grouptype
--     ├─ 安全性群組：security-*
--     │  ├─ 全域群組：security-global
--     │  ├─ 網域群組：security-domainlocal
--     │  └─ 萬用群組：security-universal
--     └─ 通訊群組：distribution
CREATE TABLE IF NOT EXISTS groups (
    groupname TEXT PRIMARY KEY,
    description TEXT,
    grouptype TEXT CHECK(
        grouptype IN (
            'security-global',
            'security-domainlocal',
            'security-universal',
            'distribution'
        )
    ) NOT NULL
);

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
