-- 建立 ous 資料表（如果不存在）
-- ou_dn 當主鍵，對應 AD 的完整 OU DN，辨別名稱
CREATE TABLE IF NOT EXISTS ous (
    ou_dn TEXT PRIMARY KEY,        -- 例如 OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com
    ouname TEXT NOT NULL,          -- 顯示名稱，例如「資訊部」
    description TEXT,              -- 說明
    ou_type TEXT CHECK(ou_type IN ('organization', 'department', 'team', 'other'))
           NOT NULL DEFAULT 'organization'
);

-- 假資料：你可以之後改成真實 AD 匯入
INSERT INTO ous (ou_dn, ouname, description, ou_type)
VALUES
    ('OU=HeadOffice,DC=corp,DC=example,DC=com',
     '總院總部',
     '總部組織單位',
     'organization'),

    ('OU=Clinic,OU=HeadOffice,DC=corp,DC=example,DC=com',
     '門診單位',
     '門診相關部門',
     'department'),

    ('OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',
     '資訊部',
     '資訊系統與網路維運',
     'department'),

    ('OU=Nursing,OU=HeadOffice,DC=corp,DC=example,DC=com',
     '護理部',
     '護理相關單位',
     'department'),

    ('OU=Doctors,OU=Clinic,OU=HeadOffice,DC=corp,DC=example,DC=com',
     '醫師群組',
     '門診醫師相關 OU',
     'team'),

    ('OU=Lab,OU=Clinic,OU=HeadOffice,DC=corp,DC=example,DC=com',
     '檢驗科',
     '檢驗相關單位',
     'team'),

    ('OU=IT-Admin,OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',
     '系統管理組',
     '系統管理與伺服器團隊',
     'team'),

    ('OU=IT-Network,OU=IT,OU=HeadOffice,DC=corp,DC=example,DC=com',
     '網路組',
     '網路與資安團隊',
     'team');