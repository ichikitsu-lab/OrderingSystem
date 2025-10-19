-- =====================================================================
-- 📡 複数デバイス間での注文同期対応マイグレーション
-- =====================================================================
-- 
-- 🎯 目的：
-- 複数の携帯端末間で注文内容（支払い前）をリアルタイム同期
-- 
-- 📝 変更内容：
-- 1. ordersテーブルのstatusカラムの定義を明確化
-- 2. 注文ステータスごとのビューを作成
-- 3. リアルタイム同期の確認
--
-- 💡 ステータスの意味：
-- - pending: 追加したが未確定（カートに追加された状態）
-- - confirmed: 注文確定済み（厨房に送信済み）
-- - completed: 支払い完了（order_historyに移動済み）
-- 
-- =====================================================================

-- =====================================================================
-- ステップ1️⃣: ordersテーブルのstatusカラム定義を更新
-- =====================================================================
-- 
-- 📌 このステップでは：
-- - ordersテーブルの既存statusカラムの制約を更新
-- - 新しいステータス値（confirmed, completed）を追加
-- - 既存データへの影響なし（デフォルト値はそのまま'pending'）
-- 
-- ✅ コピペ実行：Supabase SQL Editorで以下をそのまま実行
-- =====================================================================

-- 既存の制約を削除
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 新しい制約を追加（pending, confirmed, completedの3つのステータス）
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN ('pending', 'confirmed', 'completed')
);

-- statusカラムのコメントを更新
COMMENT ON COLUMN orders.status IS '注文状態: pending（未確定・カート内）, confirmed（注文確定済み）, completed（支払い完了）';

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ ステップ1完了: ordersテーブルのstatusカラム定義を更新しました';
  RAISE NOTICE '   - pending: 未確定（カート内）';
  RAISE NOTICE '   - confirmed: 注文確定済み';
  RAISE NOTICE '   - completed: 支払い完了';
END $$;


-- =====================================================================
-- ステップ2️⃣: 注文ステータスごとのビューを作成
-- =====================================================================
-- 
-- 📌 このステップでは：
-- - 未確定注文（pending）のみを取得するビューを作成
-- - 確定済み注文（confirmed）のみを取得するビューを作成
-- - 完了済み注文（completed）のみを取得するビューを作成
-- 
-- 💡 使用方法：
-- アプリケーションから特定のステータスの注文だけを簡単に取得できます
-- 
-- ✅ コピペ実行：Supabase SQL Editorで以下をそのまま実行
-- =====================================================================

-- 未確定注文ビュー（pending）
CREATE OR REPLACE VIEW pending_orders AS
SELECT 
  o.id,
  o.table_id,
  o.menu_item_id,
  o.quantity,
  o.unit_price,
  o.status,
  o.created_at,
  o.updated_at,
  t.number as table_number,
  m.name as menu_item_name,
  m.category as menu_category,
  (o.quantity * o.unit_price) as total_price
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN menu_items m ON o.menu_item_id = m.id
WHERE o.status = 'pending' AND o.deleted_at IS NULL;

COMMENT ON VIEW pending_orders IS '未確定注文（カート内）のみを表示';

-- 確定済み注文ビュー（confirmed）
CREATE OR REPLACE VIEW confirmed_orders AS
SELECT 
  o.id,
  o.table_id,
  o.menu_item_id,
  o.quantity,
  o.unit_price,
  o.status,
  o.created_at,
  o.updated_at,
  t.number as table_number,
  m.name as menu_item_name,
  m.category as menu_category,
  (o.quantity * o.unit_price) as total_price
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN menu_items m ON o.menu_item_id = m.id
WHERE o.status = 'confirmed' AND o.deleted_at IS NULL;

COMMENT ON VIEW confirmed_orders IS '確定済み注文（厨房送信済み）のみを表示';

-- 完了済み注文ビュー（completed）
CREATE OR REPLACE VIEW completed_orders AS
SELECT 
  o.id,
  o.table_id,
  o.menu_item_id,
  o.quantity,
  o.unit_price,
  o.status,
  o.created_at,
  o.updated_at,
  t.number as table_number,
  m.name as menu_item_name,
  m.category as menu_category,
  (o.quantity * o.unit_price) as total_price
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN menu_items m ON o.menu_item_id = m.id
WHERE o.status = 'completed' AND o.deleted_at IS NULL;

COMMENT ON VIEW completed_orders IS '完了済み注文（支払い済み）のみを表示';

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ ステップ2完了: 注文ステータスごとのビューを作成しました';
  RAISE NOTICE '   - pending_orders: 未確定注文ビュー';
  RAISE NOTICE '   - confirmed_orders: 確定済み注文ビュー';
  RAISE NOTICE '   - completed_orders: 完了済み注文ビュー';
END $$;


-- =====================================================================
-- ステップ3️⃣: リアルタイム同期の設定確認と統計ビュー作成
-- =====================================================================
-- 
-- 📌 このステップでは：
-- - ordersテーブルのリアルタイム設定を確認
-- - テーブルごとの注文ステータス統計ビューを作成
-- 
-- 💡 リアルタイム同期について：
-- ordersテーブルは既に20251018_enable_realtime.sqlで
-- リアルタイム同期が有効化されています（REPLICA IDENTITY FULL設定済み）
-- 
-- ✅ コピペ実行：Supabase SQL Editorで以下をそのまま実行
-- =====================================================================

-- リアルタイム設定の確認（既に設定済みなので、確認のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'orders' 
    AND c.relreplident = 'f'
  ) THEN
    RAISE NOTICE '✅ ordersテーブルのリアルタイム設定は既に有効です（REPLICA IDENTITY FULL）';
  ELSE
    RAISE NOTICE '⚠️ ordersテーブルのリアルタイム設定を確認してください';
    -- 念のため設定
    ALTER TABLE orders REPLICA IDENTITY FULL;
    RAISE NOTICE '✅ ordersテーブルにREPLICA IDENTITY FULLを設定しました';
  END IF;
END $$;

-- テーブルごとの注文ステータス統計ビュー
CREATE OR REPLACE VIEW table_order_status_stats AS
SELECT 
  t.id as table_id,
  t.number as table_number,
  t.status as table_status,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN o.status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_count,
  SUM(CASE WHEN o.status = 'pending' THEN o.quantity * o.unit_price ELSE 0 END) as pending_amount,
  SUM(CASE WHEN o.status = 'confirmed' THEN o.quantity * o.unit_price ELSE 0 END) as confirmed_amount,
  SUM(CASE WHEN o.status = 'completed' THEN o.quantity * o.unit_price ELSE 0 END) as completed_amount,
  SUM(o.quantity * o.unit_price) as total_amount
FROM tables t
LEFT JOIN orders o ON t.id = o.table_id AND o.deleted_at IS NULL
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.number, t.status
ORDER BY t.number;

COMMENT ON VIEW table_order_status_stats IS 'テーブルごとの注文ステータス統計（金額含む）';

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ ステップ3完了: リアルタイム同期確認と統計ビューを作成しました';
  RAISE NOTICE '   - ordersテーブルのリアルタイム同期: 有効';
  RAISE NOTICE '   - table_order_status_stats: テーブル別統計ビュー作成';
END $$;


-- =====================================================================
-- 🎉 マイグレーション完了
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '🎉 複数デバイス間注文同期マイグレーション完了！';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 変更内容:';
  RAISE NOTICE '   1. ordersテーブルのstatusカラム定義を更新';
  RAISE NOTICE '      - pending: 未確定（カート内）';
  RAISE NOTICE '      - confirmed: 注文確定済み';
  RAISE NOTICE '      - completed: 支払い完了';
  RAISE NOTICE '';
  RAISE NOTICE '   2. 注文ステータスごとのビューを作成';
  RAISE NOTICE '      - pending_orders';
  RAISE NOTICE '      - confirmed_orders';
  RAISE NOTICE '      - completed_orders';
  RAISE NOTICE '';
  RAISE NOTICE '   3. リアルタイム同期設定の確認完了';
  RAISE NOTICE '      - ordersテーブル: REPLICA IDENTITY FULL';
  RAISE NOTICE '';
  RAISE NOTICE '📡 次のステップ:';
  RAISE NOTICE '   - アプリケーションコードを更新してステータスを活用';
  RAISE NOTICE '   - pendingOrdersをデータベースに保存';
  RAISE NOTICE '   - リアルタイム同期で複数デバイス間で注文が同期される';
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
END $$;
