/*
  # 注文長押し論理削除対応のテーブル設計

  ## 概要
  注文が長押しされた時に論理削除（Soft Delete）を実行するためのデータベース設計です。
  
  ## 主な機能
  1. すべての主要テーブルに `deleted_at` カラムを追加
  2. 論理削除用のビューを作成して、アクティブなレコードのみを簡単に取得
  3. 論理削除用の関数を作成して、削除処理を簡単に実行
  4. 論理削除されたレコードの統計情報を取得する機能
  
  ## 論理削除の利点
  - データの完全性を保持（物理削除せず履歴として残す）
  - 誤削除からの復元が可能
  - 監査証跡として利用可能
  - 分析・レポーティングに使用可能

  ## テーブル一覧
  - tables: テーブル管理（論理削除対応）
  - menu_items: メニュー項目管理（論理削除対応）
  - orders: 注文管理（論理削除対応）
  - order_history: 注文履歴（論理削除対応）
*/

-- ============================================================================
-- 1. テーブル削除（既存テーブルがある場合はクリーンアップ）
-- ============================================================================

DROP TABLE IF EXISTS order_history CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS tables CASCADE;

-- ============================================================================
-- 2. テーブル作成（論理削除対応）
-- ============================================================================

-- テーブル管理テーブル
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  seats integer NOT NULL DEFAULT 2 CHECK (seats > 0),
  status text NOT NULL DEFAULT 'available',
  customer_count integer DEFAULT 0 CHECK (customer_count >= 0),
  order_start_time timestamptz,
  total_amount integer DEFAULT 0 CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  CONSTRAINT tables_status_check CHECK (
    status IN ('available', 'occupied', 'reserved', 'cleaning')
  )
);

COMMENT ON TABLE tables IS 'レストランのテーブル管理';
COMMENT ON COLUMN tables.deleted_at IS '論理削除日時（NULLの場合は有効）';

-- メニュー項目テーブル
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

COMMENT ON TABLE menu_items IS 'メニュー項目管理';
COMMENT ON COLUMN menu_items.deleted_at IS '論理削除日時（NULLの場合は有効）';

-- 注文テーブル
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  CONSTRAINT orders_status_check CHECK (
    status IN ('pending', 'preparing', 'served', 'cancelled')
  )
);

COMMENT ON TABLE orders IS '注文管理（現在進行中の注文）';
COMMENT ON COLUMN orders.deleted_at IS '論理削除日時（NULLの場合は有効）';
COMMENT ON COLUMN orders.status IS '注文状態: pending（待機中）, preparing（準備中）, served（提供済み）, cancelled（キャンセル）';

-- 注文履歴テーブル
CREATE TABLE order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL,
  items jsonb NOT NULL,
  total_amount integer NOT NULL CHECK (total_amount >= 0),
  payment_method text DEFAULT 'cash',
  completed_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  CONSTRAINT order_history_payment_method_check CHECK (
    payment_method IN ('cash', 'card', 'qr', 'other')
  )
);

COMMENT ON TABLE order_history IS '注文履歴（完了した注文の記録）';
COMMENT ON COLUMN order_history.deleted_at IS '論理削除日時（NULLの場合は有効）';
COMMENT ON COLUMN order_history.items IS 'JSON形式の注文アイテムリスト';

-- ============================================================================
-- 3. インデックス作成（パフォーマンス最適化）
-- ============================================================================

-- deleted_at カラムにインデックスを作成（論理削除クエリの高速化）
CREATE INDEX idx_tables_deleted_at ON tables(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_deleted_at ON menu_items(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_history_deleted_at ON order_history(deleted_at) WHERE deleted_at IS NULL;

-- 外部キーとステータスのインデックス
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_menu_item_id ON orders(menu_item_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_tables_status ON tables(status);

-- 日付範囲検索用のインデックス
CREATE INDEX idx_order_history_completed_at ON order_history(completed_at DESC);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================================================
-- 4. ビュー作成（アクティブなレコードのみ取得）
-- ============================================================================

-- アクティブなテーブルビュー
CREATE OR REPLACE VIEW active_tables AS
SELECT * FROM tables WHERE deleted_at IS NULL;

COMMENT ON VIEW active_tables IS '論理削除されていないテーブルのみを表示';

-- アクティブなメニューアイテムビュー
CREATE OR REPLACE VIEW active_menu_items AS
SELECT * FROM menu_items WHERE deleted_at IS NULL;

COMMENT ON VIEW active_menu_items IS '論理削除されていないメニューアイテムのみを表示';

-- アクティブな注文ビュー
CREATE OR REPLACE VIEW active_orders AS
SELECT * FROM orders WHERE deleted_at IS NULL;

COMMENT ON VIEW active_orders IS '論理削除されていない注文のみを表示';

-- アクティブな注文履歴ビュー
CREATE OR REPLACE VIEW active_order_history AS
SELECT * FROM order_history WHERE deleted_at IS NULL;

COMMENT ON VIEW active_order_history IS '論理削除されていない注文履歴のみを表示';

-- 詳細な注文ビュー（JOIN済み）
CREATE OR REPLACE VIEW orders_detail AS
SELECT 
  o.id,
  o.table_id,
  o.menu_item_id,
  o.quantity,
  o.unit_price,
  o.status,
  o.created_at,
  o.updated_at,
  o.deleted_at,
  t.number as table_number,
  t.status as table_status,
  m.name as menu_item_name,
  m.category as menu_category,
  m.image_url as menu_image_url,
  (o.quantity * o.unit_price) as total_price
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN menu_items m ON o.menu_item_id = m.id
WHERE o.deleted_at IS NULL;

COMMENT ON VIEW orders_detail IS '注文の詳細情報（テーブル・メニュー情報を含む）';

-- ============================================================================
-- 5. 論理削除用の関数作成
-- ============================================================================

-- 汎用的な論理削除関数
CREATE OR REPLACE FUNCTION soft_delete_record(
  table_name text,
  record_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL',
    table_name
  ) USING record_id;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION soft_delete_record IS '指定されたテーブルのレコードを論理削除する';

-- 注文の論理削除関数（長押し時に使用）
CREATE OR REPLACE FUNCTION soft_delete_order(order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_order record;
  result jsonb;
BEGIN
  -- 注文を論理削除
  UPDATE orders 
  SET deleted_at = now(), updated_at = now()
  WHERE id = order_id AND deleted_at IS NULL
  RETURNING * INTO deleted_order;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '注文が見つからないか、既に削除されています'
    );
  END IF;
  
  -- 成功結果を返す
  RETURN jsonb_build_object(
    'success', true,
    'message', '注文を削除しました',
    'deleted_order', row_to_json(deleted_order)
  );
END;
$$;

COMMENT ON FUNCTION soft_delete_order IS '注文を論理削除する（長押し時に使用）';

-- 注文履歴の論理削除関数
CREATE OR REPLACE FUNCTION soft_delete_order_history(history_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_history record;
BEGIN
  UPDATE order_history 
  SET deleted_at = now()
  WHERE id = history_id AND deleted_at IS NULL
  RETURNING * INTO deleted_history;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '注文履歴が見つからないか、既に削除されています'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', '注文履歴を削除しました',
    'deleted_history', row_to_json(deleted_history)
  );
END;
$$;

COMMENT ON FUNCTION soft_delete_order_history IS '注文履歴を論理削除する';

-- 論理削除の復元関数
CREATE OR REPLACE FUNCTION restore_record(
  table_name text,
  record_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NULL, updated_at = now() WHERE id = $1 AND deleted_at IS NOT NULL',
    table_name
  ) USING record_id;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION restore_record IS '論理削除されたレコードを復元する';

-- ============================================================================
-- 6. トリガー関数（自動更新）
-- ============================================================================

-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. RLS（Row Level Security）設定
-- ============================================================================

-- RLS有効化
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- パブリックアクセス用のポリシー（開発環境用）
-- 本番環境では認証ベースのポリシーに変更推奨

CREATE POLICY "Public access for tables" ON tables
  FOR ALL 
  TO anon, authenticated
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Public access for menu_items" ON menu_items
  FOR ALL 
  TO anon, authenticated
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Public access for orders" ON orders
  FOR ALL 
  TO anon, authenticated
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Public access for order_history" ON order_history
  FOR ALL 
  TO anon, authenticated
  USING (true) 
  WITH CHECK (true);

-- ============================================================================
-- 8. 初期データ投入
-- ============================================================================

-- メニューデータ
INSERT INTO menu_items (name, price, category, description, image_url) VALUES
  ('本日の日替わり定食', 980, '定食', '季節の食材を使った栄養バランスの良い定食', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('鶏の唐揚げ定食', 850, '定食', 'ジューシーな鶏の唐揚げ定食', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('焼き魚定食', 920, '定食', '新鮮な魚の焼き魚定食', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('天ぷら定食', 1100, '定食', 'サクサクの天ぷら定食', 'https://images.pexels.com/photos/2955819/pexels-photo-2955819.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('緑茶', 200, 'ドリンク', '香り豊かな緑茶', 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('ほうじ茶', 200, 'ドリンク', '香ばしいほうじ茶', 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('抹茶', 350, 'ドリンク', '本格的な抹茶', 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('アイスコーヒー', 300, 'ドリンク', '冷たいアイスコーヒー', 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('わらび餅', 380, 'デザート', 'もちもちのわらび餅', 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('みたらし団子', 320, 'デザート', '甘辛いみたらし団子', 'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('あんみつ', 450, 'デザート', '和風あんみつ', 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('抹茶アイス', 400, 'デザート', '濃厚な抹茶アイスクリーム', 'https://images.pexels.com/photos/1352278/pexels-photo-1352278.jpeg?auto=compress&cs=tinysrgb&w=300')
ON CONFLICT DO NOTHING;

-- テーブルデータ
INSERT INTO tables (number, seats, status) VALUES
  ('T1', 2, 'available'),
  ('T2', 4, 'available'),
  ('T3', 2, 'available'),
  ('T4', 6, 'available'),
  ('T5', 4, 'available'),
  ('T6', 2, 'available'),
  ('T7', 4, 'available'),
  ('T8', 8, 'available')
ON CONFLICT (number) DO NOTHING;

-- ============================================================================
-- 9. 統計・分析用のビュー
-- ============================================================================

-- 削除された注文の統計
CREATE OR REPLACE VIEW deleted_orders_stats AS
SELECT 
  DATE(deleted_at) as delete_date,
  COUNT(*) as deleted_count,
  SUM(quantity * unit_price) as total_amount
FROM orders
WHERE deleted_at IS NOT NULL
GROUP BY DATE(deleted_at)
ORDER BY delete_date DESC;

COMMENT ON VIEW deleted_orders_stats IS '削除された注文の日別統計';

-- テーブル別の注文統計
CREATE OR REPLACE VIEW table_order_stats AS
SELECT 
  t.number as table_number,
  COUNT(o.id) as total_orders,
  SUM(CASE WHEN o.deleted_at IS NULL THEN 1 ELSE 0 END) as active_orders,
  SUM(CASE WHEN o.deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted_orders,
  SUM(CASE WHEN o.deleted_at IS NULL THEN o.quantity * o.unit_price ELSE 0 END) as total_amount
FROM tables t
LEFT JOIN orders o ON t.id = o.table_id
GROUP BY t.number
ORDER BY t.number;

COMMENT ON VIEW table_order_stats IS 'テーブル別の注文統計（削除を含む）';

-- ============================================================================
-- 完了
-- ============================================================================

-- 作成されたオブジェクトの確認
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE '論理削除対応のテーブル設計が完了しました！';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'テーブル: tables, menu_items, orders, order_history';
  RAISE NOTICE 'ビュー: active_*, orders_detail, *_stats';
  RAISE NOTICE '関数: soft_delete_*, restore_record';
  RAISE NOTICE 'すべてのテーブルに deleted_at カラムが追加されました';
  RAISE NOTICE '=================================================';
END $$;
