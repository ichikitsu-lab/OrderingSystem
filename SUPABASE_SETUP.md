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

**メニューデータ（12品目）：**
- 本日の日替わり定食（980円）
- 鶏の唐揚げ定食（850円）
- 焼き魚定食（920円）
- 天ぷら定食（1100円）
- 緑茶、ほうじ茶、抹茶、アイスコーヒー
- わらび餅、みたらし団子、あんみつ、抹茶アイス

**テーブルデータ（8テーブル）：**
- T1〜T8（2〜8席）

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

## 開発環境の起動

1. `npm run dev` - Expoサーバー起動
2. Expo GOアプリでQRコードをスキャン
3. アプリが正常に動作することを確認