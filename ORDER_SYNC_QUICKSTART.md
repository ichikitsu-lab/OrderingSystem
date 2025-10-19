# 📡 複数デバイス注文同期 - クイックスタートガイド

## 🎯 このガイドの目的

複数の携帯端末間で**支払い前の注文内容**をリアルタイムに同期できるようにします。

### 現在の問題
- ❌ 携帯Aで追加した注文が、携帯Bには表示されない
- ✅ 支払い後の履歴は同期される

### 解決後
- ✅ 携帯Aで追加した注文が、携帯Bでもリアルタイムに表示
- ✅ 未確定（カート内）の注文も同期される
- ✅ 確定済み注文も同期される

---

## ⏱️ 所要時間：5分

---

## 📋 手順1: Supabase管理画面にアクセス

1. ブラウザで https://supabase.com を開く
2. ログイン
3. プロジェクトを選択
4. 左サイドバーの **「SQL Editor」** をクリック

---

## 📋 手順2: SQL実行（3ステップ）

以下の3つのSQLコードブロックを、**順番に**実行してください。
各ブロックをコピーして、SQL Editorに貼り付けて「Run」をクリックします。

---

### 🔹 ステップ1のSQL（コピーして実行）

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

**✅ 確認**: 「Success」メッセージが表示されたら次へ

---

### 🔹 ステップ2のSQL（コピーして実行）

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

**✅ 確認**: 「Success」メッセージが表示されたら次へ

---

### 🔹 ステップ3のSQL（コピーして実行）

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

**✅ 確認**: 「Success」メッセージが表示されたら完了！

---

## 🎉 セットアップ完了！

データベース設定が完了しました。以下が実現されています：

### ✅ 実現された機能

1. **注文ステータス管理**
   - `pending`: 未確定（カート内）
   - `confirmed`: 注文確定済み
   - `completed`: 支払い完了

2. **ビューの作成**
   - `pending_orders`: 未確定注文のみ
   - `confirmed_orders`: 確定済み注文のみ
   - `completed_orders`: 完了済み注文のみ
   - `table_order_status_stats`: テーブル別統計

3. **リアルタイム同期**
   - `orders`テーブルの変更が全デバイスに即座に反映

---

## 📱 次のステップ：アプリケーション側の対応

データベース設定は完了しましたが、アプリケーションコードも更新が必要です。

### 必要な変更

#### ファイル: `app/order.tsx`

1. **pendingOrdersをデータベースに保存**
   ```typescript
   // 現在：ローカルステート（useState）のみ
   // 変更後：データベースに保存（status='pending'）
   ```

2. **注文確定時にステータス更新**
   ```typescript
   // status='pending' → 'confirmed'
   ```

3. **支払い完了時にステータス更新**
   ```typescript
   // status='confirmed' → 'completed'
   ```

### 期待される動作

- ✅ 携帯Aでメニューを追加 → データベースに保存（status='pending'）
- ✅ 携帯Bでリアルタイム同期 → 追加されたメニューが即座に表示
- ✅ 携帯Aで注文確定 → status='confirmed'に更新
- ✅ 携帯Bでも確定済みとして表示
- ✅ 携帯Aで支払い完了 → status='completed'に更新、order_historyに保存

---

## 🔍 動作確認方法

### データベース側の確認

Supabase SQL Editorで以下のクエリを実行：

```sql
-- 未確定注文を確認
SELECT * FROM pending_orders;

-- 確定済み注文を確認
SELECT * FROM confirmed_orders;

-- テーブル別統計を確認
SELECT * FROM table_order_status_stats;
```

### アプリケーション側の確認

1. 2台の携帯端末でアプリを開く
2. 携帯Aでメニューを追加
3. 携帯Bで同じテーブルの注文画面を開く
4. 携帯Aで追加したメニューが携帯Bでも表示されることを確認

---

## 📚 関連ドキュメント

- **詳細手順**: `SUPABASE_SETUP.md` の「複数デバイス間での注文同期設定」セクション
- **マイグレーションファイル**: `supabase/migrations/20251019_order_status_sync.sql`
- **リアルタイム同期**: `REALTIME_SETUP.md`

---

## 🆘 トラブルシューティング

### SQLエラーが発生した場合

1. エラーメッセージを確認
2. 既存のテーブル構造を確認：
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'orders';
   ```
3. マイグレーションファイル `20251019_order_status_sync.sql` を確認

### リアルタイム同期が動作しない場合

1. Supabase管理画面で「Database」→「Replication」を確認
2. `orders`テーブルがリアルタイム有効になっているか確認
3. `REPLICA IDENTITY FULL`が設定されているか確認：
   ```sql
   SELECT relname, relreplident 
   FROM pg_class 
   WHERE relname = 'orders';
   ```
   (`relreplident`が`'f'`であればOK)

---

🍵 **茶茶日和での複数端末運用をサポートします！**
