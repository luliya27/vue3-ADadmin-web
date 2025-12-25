-- 修正 ous 資料表的 parentou 值
-- parentou 應該反映該 OU 是否有子層

-- 1. 先將所有 OU 的 parentou 設為 0
UPDATE ous SET parentou = 0;

-- 2. 將有子層的 OU 的 parentou 設為 1
UPDATE ous
SET parentou = 1
WHERE ou_dn IN (
    SELECT DISTINCT parent_dn
    FROM ous
    WHERE parent_dn IS NOT NULL
);

-- 3. 修正 222 的 parent_dn（如果需要）
-- 假設 222 的父層是 111，而 111 的 ou_dn 已經包含了完整的階層
UPDATE ous
SET parent_dn = (
    SELECT ou_dn
    FROM ous
    WHERE ouname = '111'
)
WHERE ouname = '222';

-- 顯示修正後的結果
SELECT id, ouname, ou_dn, parent_dn, parentou
FROM ous
ORDER BY ou_dn;
