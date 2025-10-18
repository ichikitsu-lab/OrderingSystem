# 論理削除機能クイックスタートガイド 🚀

## 🎯 5分でセットアップ！

このガイドでは、注文長押し時の論理削除機能を最速でセットアップする方法を説明します。

## ⚡ ステップ1: SQLを実行（2分）

### 1. Supabase管理画面を開く

```
https://supabase.com/dashboard
```

### 2. SQLエディタを開く

1. プロジェクトを選択
2. 左サイドバー → 「SQL Editor」
3. 「New Query」をクリック

### 3. SQLをコピー&実行

`supabase/migrations/20251018_logical_delete_setup.sql` の内容を全てコピーして、エディタに貼り付けて「Run」！

## ✅ ステップ2: 動作確認（1分）

### 接続テスト

```bash
cd /home/user/webapp
node test-supabase.js
```

### 成功メッセージ

```
論理削除対応のテーブル設計が完了しました！
テーブル: tables, menu_items, orders, order_history
```

## 🔧 ステップ3: アプリに実装（2分）

### React Nativeでの実装例

```tsx
import { supabase } from '@/lib/supabase';

// 注文長押しで削除
const handleLongPress = async (orderId: string) => {
  const { data } = await supabase.rpc('soft_delete_order', { 
    order_id: orderId 
  });
  
  if (data?.success) {
    Alert.alert('成功', data.message);
  }
};

// TouchableOpacityに設定
<TouchableOpacity onLongPress={() => handleLongPress(order.id)}>
  <Text>{order.name}</Text>
</TouchableOpacity>
```

## 📋 基本的な使い方

### 1. アクティブな注文を取得

```typescript
// 方法1: ビューを使用（推奨）
const { data } = await supabase.from('active_orders').select('*');

// 方法2: 条件指定
const { data } = await supabase
  .from('orders')
  .select('*')
  .is('deleted_at', null);
```

### 2. 注文を論理削除

```typescript
// 関数を使用（推奨）
const { data } = await supabase.rpc('soft_delete_order', { 
  order_id: 'uuid-here' 
});

// または直接UPDATE
const { data } = await supabase
  .from('orders')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', 'uuid-here');
```

### 3. 削除された注文を復元

```typescript
const { data } = await supabase.rpc('restore_record', { 
  table_name: 'orders',
  record_id: 'uuid-here' 
});
```

## 🎨 UI実装例

### 長押しで削除確認ダイアログ

```tsx
import { Alert } from 'react-native';

const OrderItem = ({ order, onDelete }) => {
  const handleLongPress = () => {
    Alert.alert(
      '注文を削除',
      'この注文を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            const { data } = await supabase.rpc('soft_delete_order', {
              order_id: order.id
            });
            
            if (data?.success) {
              onDelete(order.id);
              Alert.alert('成功', '注文を削除しました');
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <View style={styles.orderItem}>
        <Text>{order.menu_item_name}</Text>
        <Text>数量: {order.quantity}</Text>
        <Text>¥{order.unit_price * order.quantity}</Text>
      </View>
    </TouchableOpacity>
  );
};
```

## 📊 便利なビュー

### 注文詳細（JOIN済み）

```typescript
// テーブル・メニュー情報を含む注文詳細
const { data } = await supabase
  .from('orders_detail')
  .select('*')
  .eq('table_id', tableId);

// 結果:
// {
//   id, quantity, unit_price, status,
//   table_number, table_status,
//   menu_item_name, menu_category, menu_image_url,
//   total_price
// }
```

### テーブル別統計

```typescript
// テーブル別の注文統計
const { data } = await supabase
  .from('table_order_stats')
  .select('*');

// 結果:
// {
//   table_number: 'T1',
//   total_orders: 10,
//   active_orders: 8,
//   deleted_orders: 2,
//   total_amount: 5000
// }
```

## 🔍 デバッグ方法

### テーブル確認

```sql
-- Supabase SQLエディタで実行
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 関数確認

```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE 'soft_delete%';
```

### データ確認

```sql
-- 全ての注文（削除含む）
SELECT id, quantity, deleted_at FROM orders;

-- アクティブな注文のみ
SELECT * FROM active_orders;

-- 削除された注文のみ
SELECT * FROM orders WHERE deleted_at IS NOT NULL;
```

## 🚨 よくあるエラー

### エラー1: `relation "active_orders" does not exist`

**原因**: ビューが作成されていない

**解決**: SQLマイグレーションを再実行

### エラー2: `function soft_delete_order does not exist`

**原因**: 関数が作成されていない

**解決**: SQLマイグレーションを再実行

### エラー3: 削除したのに表示される

**原因**: `deleted_at IS NULL` の条件が抜けている

**解決**: ビューを使用するか、WHERE句を追加

```typescript
// ❌ 間違い
.from('orders').select('*')

// ✅ 正しい
.from('active_orders').select('*')
```

## 📖 次のステップ

詳細な情報は以下を参照してください:

- **完全ガイド**: `LOGICAL_DELETE_SETUP.md`
- **テーブル設計**: `supabase/migrations/20251018_logical_delete_setup.sql`
- **Supabase設定**: `SUPABASE_SETUP.md`

## 🎓 学習リソース

### テストクエリ

Supabase SQLエディタで以下を試してみてください:

```sql
-- 1. アクティブな注文を取得
SELECT * FROM active_orders;

-- 2. 注文の詳細を取得
SELECT * FROM orders_detail WHERE table_number = 'T1';

-- 3. テスト用の注文を作成
INSERT INTO orders (table_id, menu_item_id, quantity, unit_price)
SELECT 
  (SELECT id FROM tables LIMIT 1),
  (SELECT id FROM menu_items LIMIT 1),
  2,
  500;

-- 4. 作成した注文を論理削除
SELECT soft_delete_order(
  (SELECT id FROM orders WHERE deleted_at IS NULL LIMIT 1)
);

-- 5. 削除された注文を確認
SELECT * FROM orders WHERE deleted_at IS NOT NULL;

-- 6. 復元してみる
SELECT restore_record(
  'orders',
  (SELECT id FROM orders WHERE deleted_at IS NOT NULL LIMIT 1)
);
```

## 💡 ヒント

### パフォーマンス向上

```typescript
// ✅ Good: ビューを使用
await supabase.from('active_orders').select('*');

// ✅ Good: 必要なカラムのみ取得
await supabase.from('active_orders').select('id, quantity, unit_price');

// ❌ Bad: 全テーブルスキャン
await supabase.from('orders').select('*').is('deleted_at', null);
```

### バッチ処理

```typescript
// 複数の注文を一度に削除
const orderIds = ['id1', 'id2', 'id3'];

await supabase
  .from('orders')
  .update({ deleted_at: new Date().toISOString() })
  .in('id', orderIds);
```

## 📞 サポート

質問や問題がある場合:

1. ✅ このガイドを再確認
2. ✅ `node test-supabase.js` で接続テスト
3. ✅ Supabase管理画面でテーブル確認
4. ✅ `LOGICAL_DELETE_SETUP.md` で詳細を確認

---

🍵 **簡単3ステップで論理削除機能の完成！**
