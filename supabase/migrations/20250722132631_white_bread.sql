/*
  # テーブル管理システムのデータベーススキーマ

  1. 新しいテーブル
    - `tables` - レストランのテーブル管理
    - `menu_items` - メニュー項目管理  
    - `orders` - 注文管理
    - `order_history` - 注文履歴

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - パブリックアクセス用のポリシーを設定（開発環境用）
    - 本番環境では認証ベースのポリシーに変更推奨

  3. 変更点
    - RLSポリシーをパブリックアクセス可能に変更
    - 初期データ投入時のエラーを解決
*/

-- テーブル管理テーブル
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  seats integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'available',
  customer_count integer DEFAULT 0,
  order_start_time timestamptz,
  total_amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT tables_status_check CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning'))
);

-- メニュー項目テーブル
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 注文テーブル
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES tables(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 注文履歴テーブル
CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL,
  items jsonb NOT NULL,
  total_amount integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);

-- Row Level Security を有効化
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- パブリックアクセス用のポリシー（開発環境用）
-- 注意: 本番環境では認証ベースのポリシーに変更してください

-- テーブル管理のポリシー
CREATE POLICY "Public access for tables" ON tables
  FOR ALL USING (true) WITH CHECK (true);

-- メニュー項目のポリシー
CREATE POLICY "Public access for menu_items" ON menu_items
  FOR ALL USING (true) WITH CHECK (true);

-- 注文のポリシー
CREATE POLICY "Public access for orders" ON orders
  FOR ALL USING (true) WITH CHECK (true);

-- 注文履歴のポリシー
CREATE POLICY "Public access for order_history" ON order_history
  FOR ALL USING (true) WITH CHECK (true);