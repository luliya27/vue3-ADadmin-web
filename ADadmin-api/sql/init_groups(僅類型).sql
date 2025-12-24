-- 建立 groups 資料表（如果不存在）
CREATE TABLE IF NOT EXISTS groups (
    name TEXT PRIMARY KEY,                     -- 群組名稱，當主鍵
    description TEXT,                          -- 群組描述
    type TEXT CHECK(type IN ('security', 'distribution', 'org', 'other'))
         NOT NULL DEFAULT 'security'           -- 群組類型
);

-- 匯入假資料
INSERT INTO groups (name, description, type)
VALUES
    ('IT_Admins', '資訊部系統管理員群組', 'security'),
    ('Nursing_Leaders', '護理部護理長與主管群組', 'org'),
    ('Doctors_All', '全院醫師廣播群組', 'distribution'),
    ('Temp_Staff', '臨時人員、工讀生相關權限群組', 'security'),
    ('HR_Announcement', '人資公告用群組', 'distribution'),
    ('Lab_Team', '檢驗科工作群組', 'org');
