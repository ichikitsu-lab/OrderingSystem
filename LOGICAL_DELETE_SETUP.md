# 論理削除対応セットアップガイド 🗑️

## 📋 概要

このガイドでは、注文長押し時の論理削除（Soft Delete）機能に対応したデータベース設計とセットアップ方法を説明します。

## 🎯 論理削除とは？

**論理削除（Soft Delete）** は、データを物理的に削除せず、`deleted_at`フィールドにタイムスタンプを記録することで「削除済み」として扱う手法です。

### 論理削除の利点

✅ **データの完全性**: 削除したデータを履歴として保持  
✅ **復元可能**: 誤削除からの復元が簡単  
✅ **監査証跡**: いつ誰が削除したかを記録  
✅ **分析可能**: 削除されたデータも分析・レポーティングに使用可能  
✅ **外部キー保護**: 関連データが削除されても参照整合性を維持

### 物理削除との比較

| 項目 | 論理削除 | 物理削除 |
|------|---------|---------|
| データ保持 | ✅ 保持される | ❌ 完全に削除 |
| 復元可能性 | ✅ 簡単 | ❌ 不可能 |
| ストレージ | 📊 増加する | 💾 削減される |
| パフォーマンス | ⚠️ インデックス要 | ✅ 軽量 |
| 監査証跡 | ✅ 完全 | ❌ なし |

## 🏗️ テーブル設計

### 1. tables（テーブル管理）

```sql
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  seats integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'available',
  customer_count integer DEFAULT 0,
  order_start_time timestamptz,
  total_amount integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL  -- 論理削除フィールド
);
```

**フィールド説明**:
- `deleted_at`: NULL = 有効、タイムスタンプあり = 削除済み
- `status`: available（空席）, occupied（使用中）, reserved（予約済み）, cleaning（清掃中）

### 2. menu_items（メニュー項目）

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
  deleted_at timestamptz DEFAULT NULL  -- 論理削除フィールド
);
```

**カテゴリー例**: 定食、ドリンク、デザート

### 3. orders（注文管理）

```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL  -- 論理削除フィールド
);
```

**ステータス**:
- `pending`: 待機中（注文受付済み）
- `preparing`: 準備中（調理中）
- `served`: 提供済み
- `cancelled`: キャンセル

### 4. order_history（注文履歴）

```sql
CREATE TABLE order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL,
  items jsonb NOT NULL,
  total_amount integer NOT NULL CHECK (total_amount >= 0),
  payment_method text DEFAULT 'cash',
  completed_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL  -- 論理削除フィールド
);
```

**支払い方法**: cash（現金）, card（カード）, qr（QRコード）, other（その他）

## 🔍 ビュー（View）

論理削除されていないアクティブなレコードのみを取得するビューを用意しています。

### アクティブレコード用ビュー

```sql
-- 有効なテーブルのみ
SELECT * FROM active_tables;

-- 有効なメニューのみ
SELECT * FROM active_menu_items;

-- 有効な注文のみ
SELECT * FROM active_orders;

-- 有効な注文履歴のみ
SELECT * FROM active_order_history;
```

### 詳細ビュー

```sql
-- 注文の詳細（テーブル・メニュー情報を含む）
SELECT * FROM orders_detail;

-- テーブル別の注文統計
SELECT * FROM table_order_stats;

-- 削除された注文の統計
SELECT * FROM deleted_orders_stats;
```

## 🛠️ 論理削除関数

### 1. 注文の論理削除（長押し時に使用）

```sql
-- 注文を論理削除
SELECT soft_delete_order('注文ID');
```

**返り値の例**:
```json
{
  "success": true,
  "message": "注文を削除しました",
  "deleted_order": { ... }
}
```

### 2. 注文履歴の論理削除

```sql
-- 注文履歴を論理削除
SELECT soft_delete_order_history('履歴ID');
```

### 3. 汎用的な論理削除

```sql
-- 任意のテーブルのレコードを論理削除
SELECT soft_delete_record('テーブル名', 'レコードID');
```

### 4. 削除の復元

```sql
-- 論理削除されたレコードを復元
SELECT restore_record('テーブル名', 'レコードID');
```

## 📊 使用例

### JavaScript/TypeScript（Supabase Client）

```typescript
// 1. アクティブな注文を取得（論理削除されていないもの）
const { data: activeOrders } = await supabase
  .from('orders')
  .select('*')
  .is('deleted_at', null);

// または、ビューを使用
const { data: activeOrders } = await supabase
  .from('active_orders')
  .select('*');

// 2. 注文を論理削除（長押し時）
const { data: result } = await supabase
  .rpc('soft_delete_order', { order_id: 'uuid-here' });

if (result.success) {
  console.log(result.message);
}

// 3. 削除された注文を含めて全件取得
const { data: allOrders } = await supabase
  .from('orders')
  .select('*');

// 4. 削除された注文のみ取得
const { data: deletedOrders } = await supabase
  .from('orders')
  .select('*')
  .not('deleted_at', 'is', null);

// 5. 論理削除された注文を復元
const { data: restored } = await supabase
  .rpc('restore_record', { 
    table_name: 'orders', 
    record_id: 'uuid-here' 
  });
```

### React Nativeでの実装例

```tsx
// hooks/useOrders.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const useOrders = (tableId: string) => {
  const [orders, setOrders] = useState([]);

  // アクティブな注文を取得
  const fetchActiveOrders = async () => {
    const { data } = await supabase
      .from('active_orders')
      .select('*')
      .eq('table_id', tableId);
    setOrders(data || []);
  };

  // 注文を論理削除（長押し時）
  const deleteOrder = async (orderId: string) => {
    const { data } = await supabase
      .rpc('soft_delete_order', { order_id: orderId });
    
    if (data?.success) {
      // UIから削除
      setOrders(orders.filter(o => o.id !== orderId));
      return true;
    }
    return false;
  };

  return { orders, fetchActiveOrders, deleteOrder };
};
```

```tsx
// 注文アイテムコンポーネントでの使用
const OrderItem = ({ order }) => {
  const { deleteOrder } = useOrders(order.table_id);

  const handleLongPress = async () => {
    const success = await deleteOrder(order.id);
    if (success) {
      Alert.alert('成功', '注文を削除しました');
    }
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress}>
      {/* 注文アイテムのUI */}
    </TouchableOpacity>
  );
};
```

## 🚀 セットアップ手順

### ステップ1: Supabase管理画面にログイン

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」をクリック

### ステップ2: マイグレーションSQLを実行

1. 「New Query」をクリック
2. `supabase/migrations/20251018_logical_delete_setup.sql` の内容をコピー
3. エディタに貼り付け
4. 「Run」ボタンをクリックして実行

### ステップ3: 実行結果の確認

成功すると以下のメッセージが表示されます:

```
=================================================
論理削除対応のテーブル設計が完了しました！
=================================================
テーブル: tables, menu_items, orders, order_history
ビュー: active_*, orders_detail, *_stats
関数: soft_delete_*, restore_record
すべてのテーブルに deleted_at カラムが追加されました
=================================================
```

### ステップ4: 接続テスト

```bash
cd /home/user/webapp
node test-supabase.js
```

## 🔐 セキュリティ（RLS）

すべてのテーブルでRow Level Security（RLS）が有効化されています。

現在の設定（開発環境用）:
```sql
CREATE POLICY "Public access for tables" ON tables
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
```

**⚠️ 本番環境では認証ベースのポリシーに変更してください！**

### 本番環境用のポリシー例

```sql
-- 認証済みユーザーのみアクセス可能
CREATE POLICY "Authenticated users only" ON orders
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 特定ロールのみ削除可能
CREATE POLICY "Only managers can delete" ON orders
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' = 'manager')
  WITH CHECK (auth.jwt() ->> 'role' = 'manager');
```

## 📈 パフォーマンス最適化

### インデックス

論理削除クエリを高速化するため、以下のインデックスが作成されています:

```sql
-- deleted_at が NULL のレコードのみをインデックス化
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at) 
WHERE deleted_at IS NULL;
```

これにより、アクティブなレコードの検索が高速化されます。

### クエリのベストプラクティス

```typescript
// ❌ 遅い（全レコードをスキャン）
const { data } = await supabase
  .from('orders')
  .select('*')
  .is('deleted_at', null);

// ✅ 速い（ビューを使用）
const { data } = await supabase
  .from('active_orders')
  .select('*');
```

## 🧹 データメンテナンス

### 古い削除済みデータのクリーンアップ

論理削除されたデータが蓄積する場合、定期的に物理削除することを検討してください。

```sql
-- 30日以上前に削除されたデータを物理削除
DELETE FROM orders 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';
```

**⚠️ 注意**: 物理削除すると復元不可能になります！

### 削除済みデータのアーカイブ

```sql
-- アーカイブテーブルに移動
INSERT INTO orders_archive 
SELECT * FROM orders 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';

-- 元のテーブルから削除
DELETE FROM orders 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';
```

## 📊 分析・レポート

### 削除された注文の統計

```sql
-- 日別の削除統計
SELECT * FROM deleted_orders_stats;

-- 今月の削除件数
SELECT COUNT(*) as deleted_count
FROM orders
WHERE deleted_at >= DATE_TRUNC('month', NOW());

-- テーブル別の削除率
SELECT * FROM table_order_stats;
```

## 🐛 トラブルシューティング

### Q1: ビューが見つからない

**解決策**: マイグレーションSQLを再実行してください。

### Q2: 関数が実行できない

**エラー**: `function soft_delete_order does not exist`

**解決策**: 
```sql
-- 関数の存在確認
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'soft_delete%';
```

関数が存在しない場合は、マイグレーションSQLを再実行してください。

### Q3: 削除されたデータが表示される

**原因**: `deleted_at IS NULL` の条件が抜けている

**解決策**: ビューを使用するか、WHERE句を追加してください。
```typescript
// ❌ 削除済みも含む
.from('orders').select('*')

// ✅ アクティブのみ
.from('active_orders').select('*')
// または
.from('orders').select('*').is('deleted_at', null)
```

### Q4: パフォーマンスが遅い

**解決策**: 
1. インデックスが作成されているか確認
2. ビューを使用する
3. `deleted_at IS NULL` の条件を必ず含める

## 📚 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [PostgreSQL論理削除のベストプラクティス](https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_soft_deletes)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 サポート

問題が発生した場合:

1. このドキュメントのトラブルシューティングを確認
2. `node test-supabase.js` で接続テスト
3. Supabase管理画面でテーブル・関数の存在を確認
4. SQLログでエラー内容を確認

---

🍵 **茶茶日和 - 注文管理を安全に、確実に**
