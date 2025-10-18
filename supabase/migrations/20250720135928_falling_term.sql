/*
  # カフェPOSシステム用データベーススキーマ

  1. 新しいテーブル
    - `tables` - テーブル管理
      - `id` (uuid, primary key)
      - `number` (text) - テーブル番号
      - `seats` (integer) - 席数
      - `status` (text) - 状態 (available, occupied, reserved, cleaning)
      - `customer_count` (integer) - 客数
      - `order_start_time` (timestamptz) - 注文開始時刻
      - `total_amount` (integer) - 合計金額
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `menu_items` - メニュー項目
      - `id` (uuid, primary key)
      - `name` (text) - 商品名
      - `price` (integer) - 価格
      - `category` (text) - カテゴリ
      - `description` (text) - 説明
      - `image_url` (text) - 画像URL
      - `is_active` (boolean) - 有効フラグ
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `orders` - 注文
      - `id` (uuid, primary key)
      - `table_id` (uuid, foreign key)
      - `menu_item_id` (uuid, foreign key)
      - `quantity` (integer) - 数量
      - `unit_price` (integer) - 単価
      - `created_at` (timestamptz)

    - `order_history` - 注文履歴
      - `id` (uuid, primary key)
      - `table_number` (text) - テーブル番号
      - `items` (jsonb) - 注文項目
      - `total_amount` (integer) - 合計金額
      - `completed_at` (timestamptz) - 完了時刻

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - 認証されたユーザーのみアクセス可能
*/

-- テーブル管理
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  seats integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  customer_count integer DEFAULT 0,
  order_start_time timestamptz,
  total_amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- メニュー項目
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

-- 注文
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES tables(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 注文履歴
CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL,
  items jsonb NOT NULL,
  total_amount integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);

-- RLSを有効化
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成（認証されたユーザーのみアクセス可能）
CREATE POLICY "Authenticated users can manage tables"
  ON tables
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage menu items"
  ON menu_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view order history"
  ON order_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 初期メニューデータを挿入
INSERT INTO menu_items (name, price, category, description, image_url) VALUES
  ('本日の日替わり定食', 980, '定食', '季節の食材を使った栄養バランスの良い定食', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('鶏の唐揚げ定食', 850, '定食', 'ジューシーな鶏の唐揚げ定食', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('焼き魚定食', 920, '定食', '新鮮な魚の焼き物定食', 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('緑茶', 200, 'ドリンク', '香り高い緑茶', 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('ほうじ茶', 200, 'ドリンク', '香ばしいほうじ茶', 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('抹茶', 350, 'ドリンク', '本格的な抹茶', 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('わらび餅', 380, 'デザート', 'なめらかなわらび餅', 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('みたらし団子', 320, 'デザート', '甘辛いみたらし団子', 'https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=300'),
  ('あんみつ', 450, 'デザート', '和風あんみつ', 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=300')
ON CONFLICT DO NOTHING;

-- 初期テーブルデータを挿入
INSERT INTO tables (number, seats, status) VALUES
  ('T1', 2, 'available'),
  ('T2', 4, 'available'),
  ('T3', 2, 'available'),
  ('T4', 6, 'available'),
  ('T5', 4, 'available'),
  ('T6', 2, 'available'),
  ('T7', 4, 'available'),
  ('T8', 8, 'available')
ON CONFLICT DO NOTHING;