# Supabase設定手順

## 現在の状況

✅ 環境変数の設定完了
✅ .envファイル作成完了
✅ Supabaseクライアント設定完了
✅ データベーステーブルの作成完了（論理削除対応）

## データベーススキーマ

### テーブル一覧

1. **tables** - テーブル管理
2. **menu_items** - メニュー項目管理
3. **orders** - 注文管理（現在進行中の注文）
4. **order_history** - 注文履歴（完了した注文の記録）

すべてのテーブルに `deleted_at` カラムが含まれており、論理削除（Soft Delete）に対応しています。

### テーブル詳細

#### 1. tables（テーブル管理）
```sql
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
```

#### 2. menu_items（メニュー項目管理）
```sql
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
```

#### 3. orders（注文管理）
```sql
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
```

#### 4. order_history（注文履歴）
```sql
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
```

### ビュー

アクティブなレコード（論理削除されていないレコード）のみを取得するビューが用意されています：

- `active_tables` - 削除されていないテーブル
- `active_menu_items` - 削除されていないメニュー項目
- `active_orders` - 削除されていない注文
- `active_order_history` - 削除されていない注文履歴
- `orders_detail` - 注文の詳細情報（JOIN済み）

### 関数

論理削除用の関数が用意されています：

- `soft_delete_record(table_name, record_id)` - 汎用的な論理削除関数
- `soft_delete_order(order_id)` - 注文の論理削除
- `soft_delete_order_history(history_id)` - 注文履歴の論理削除
- `restore_record(table_name, record_id)` - 論理削除の復元

### RLS（Row Level Security）

すべてのテーブルでRLSが有効化されており、開発環境用のパブリックアクセスポリシーが設定されています：

```sql
-- すべてのテーブルでRLS有効化
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- 開発環境用ポリシー（本番環境では認証ベースに変更推奨）
CREATE POLICY "Public access for tables" ON tables
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public access for menu_items" ON menu_items
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public access for orders" ON orders
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public access for order_history" ON order_history
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
```

### 初期データ

マイグレーション実行時に以下の初期データが自動的に挿入されます：

INSERT INTO menu_items (name, price, category, description) VALUES
('本日の日替わり定食', 980, '定食', '毎日変わるメイン料理と小鉢のセット'),
('鶏の唐揚げ定食', 850, '定食', '定番のジューシーな唐揚げ'),
('焼き魚定食', 920, '定食', '季節の魚を丁寧に焼き上げました'),
('天ぷら定食', 1100, '定食', '海老と野菜のサクサク天ぷら'),

('緑茶', 200, 'ドリンク', '温かい緑茶'),
('ほうじ茶', 200, 'ドリンク', '香ばしいほうじ茶'),
('抹茶', 400, 'ドリンク', '本格的な抹茶'),
('アイスコーヒー', 350, 'ドリンク', 'すっきりとしたアイスコーヒー'),

('わらび餅', 450, '甘味', 'きな粉と黒蜜で'),
('みたらし団子', 300, '甘味', '甘じょっぱいタレが絶品'),
('あんみつ', 550, '甘味', 'あんこ、寒天、フルーツの盛り合わせ'),
('抹茶アイス', 480, '甘味', '濃厚な抹茶風味のアイス');

**テーブルデータ（8テーブル）：**
INSERT INTO tables (number, seats, status) VALUES
('T1', 2, 'available'),
('T2', 2, 'available'),
('T3', 4, 'available'),
('T4', 4, 'available'),
('T5', 6, 'available'),
('T6', 6, 'available'),
('T7', 8, 'available'),
('T8', 8, 'available');

## マイグレーション

最新のマイグレーションファイル：
- `supabase/migrations/20251018_logical_delete_setup.sql`

このマイグレーションには以下が含まれています：
- すべてのテーブル定義
- インデックス
- ビュー
- 論理削除用の関数
- RLSポリシー
- 初期データ

## 確認事項

- ✅ Supabaseテーブルが作成されている
- ✅ RLSポリシーが正しく設定されている
- ✅ 論理削除機能が実装されている
- ✅ 初期データが投入されている

## 使用方法

### 論理削除の実行

長押しで注文を削除する場合：
```typescript
await database.softDeleteOrder(orderId);
```

注文履歴を削除する場合：
```typescript
await database.softDeleteOrderHistory(historyId);
```

### データの取得

アクティブな注文履歴のみを取得：
```typescript
const history = await database.getOrderHistory();
```

すべての注文履歴（削除済みを含む）を取得する場合は、直接SQLクエリを使用します。

## トラブルシューティング

### データベース接続エラー
→ `.env`ファイルのURL・Keyが正しいか確認

### マイグレーション適用エラー
→ マイグレーションファイル `20251018_logical_delete_setup.sql` を再実行

### RLSエラー
→ RLSポリシーが正しく設定されているか確認

## 🆕 複数デバイス間での注文同期設定（2025年10月19日追加）

### 問題点
現在、支払い前の注文内容が複数デバイス間で同期されていません。
- ✅ 支払い後の履歴：すべてのデバイスで同じ
- ❌ 支払い前の注文：同期されない

### 解決策
`orders`テーブルの`status`カラムを活用して、注文の状態を管理します。

#### 注文ステータスの種類
- **pending**: 未確定（カートに追加された状態）
- **confirmed**: 注文確定済み（厨房に送信済み）
- **completed**: 支払い完了（order_historyに移動済み）

### 📋 セットアップ手順（3ステップ）

#### ⚠️ 重要：この作業を始める前に
Supabaseのマイグレーションファイル `supabase/migrations/20251019_order_status_sync.sql` を確認してください。

#### 実行方法

1. **Supabase管理画面にアクセス**
   - https://supabase.com にログイン
   - プロジェクトを選択
   - 左サイドバーの「SQL Editor」をクリック

2. **以下の3つのSQLを順番に実行**

---

#### 🔹 ステップ1: ordersテーブルのstatusカラム定義を更新

```sql
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
```

**✅ 期待される結果**: 
- Success（成功）メッセージが表示される
- ordersテーブルのstatusカラムが更新される

---

#### 🔹 ステップ2: 注文ステータスごとのビューを作成

```sql
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
```

**✅ 期待される結果**:
- Success（成功）メッセージが表示される
- 3つのビュー（pending_orders, confirmed_orders, completed_orders）が作成される

---

#### 🔹 ステップ3: リアルタイム同期の設定確認と統計ビュー作成

```sql
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
```

**✅ 期待される結果**:
- Success（成功）メッセージが表示される
- リアルタイム同期が有効であることが確認される
- 統計ビュー（table_order_status_stats）が作成される

---

### 🎉 セットアップ完了の確認

すべてのステップが完了すると、以下が実現されます：

- ✅ `orders`テーブルに3つのステータス（pending, confirmed, completed）
- ✅ 各ステータスごとのビュー（pending_orders, confirmed_orders, completed_orders）
- ✅ リアルタイム同期が有効（複数デバイス間で注文が同期）
- ✅ 統計ビュー（table_order_status_stats）

### 📱 アプリケーション側の対応

データベース設定後、アプリケーションコード（`app/order.tsx`など）を更新して：
1. **pendingOrders**（未確定注文）をデータベースに保存（status='pending'）
2. **注文確定時**にステータスを'confirmed'に更新
3. **支払い完了時**にステータスを'completed'に更新

これにより、複数のデバイス間で注文内容がリアルタイムに同期されます。

---

## 開発環境の起動

1. `npm run dev` - Expoサーバー起動
2. Expo GOアプリでQRコードをスキャン
3. アプリが正常に動作することを確認
