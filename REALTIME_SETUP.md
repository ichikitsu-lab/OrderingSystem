# 📡 リアルタイム同期機能セットアップガイド

## 🎯 概要

このガイドでは、複数の携帯端末間でテーブル状態と注文内容をリアルタイムに同期する機能のセットアップ方法を説明します。

### ✨ 実現される機能

1. **テーブル状態のリアルタイム同期**
   - 携帯Aがテーブルを「使用中」にすると、携帯Bでも即座に反映
   - テーブルの追加・削除・名前変更が全端末で同期

2. **注文内容のリアルタイム同期**
   - 携帯Aで注文を追加すると、携帯Bの注文画面にも即座に表示
   - 合計金額の変更も全端末で同期

3. **会計処理のリアルタイム同期**
   - 携帯Aで会計完了すると、携帯Bでもテーブルが「空席」に戻る

## 🚀 セットアップ手順

### ステップ1️⃣: Supabaseでリアルタイム機能を有効化

#### 方法A: SQLエディタでマイグレーションを実行（推奨）

1. **Supabase管理画面にアクセス**
   - https://supabase.com にログイン
   - プロジェクトを選択

2. **SQLエディタを開く**
   - 左サイドバーの「SQL Editor」をクリック

3. **マイグレーションSQLを実行**
   ```sql
   -- supabase/migrations/20251018_enable_realtime.sql の内容を貼り付けて実行
   ```

4. **実行結果を確認**
   - ✅ が表示されれば成功

#### 方法B: Supabase UIで手動設定

1. **Database → Replication を開く**
   - 左サイドバーの「Database」→「Replication」をクリック

2. **各テーブルのリアルタイムを有効化**
   - `tables` テーブル: リアルタイムを「ON」
   - `orders` テーブル: リアルタイムを「ON」
   - `menu_items` テーブル: リアルタイムを「ON」
   - `order_history` テーブル: リアルタイムを「ON」

3. **REPLICA IDENTITYを設定**
   ```sql
   ALTER TABLE tables REPLICA IDENTITY FULL;
   ALTER TABLE orders REPLICA IDENTITY FULL;
   ALTER TABLE menu_items REPLICA IDENTITY FULL;
   ALTER TABLE order_history REPLICA IDENTITY FULL;
   ```

### ステップ2️⃣: アプリケーションコードの確認

リアルタイム同期機能は既に実装済みです。以下のファイルで確認できます：

#### `lib/database.ts`
- `subscribeToTables()` - テーブル変更の購読
- `subscribeToOrders()` - 注文変更の購読
- `unsubscribe()` - 購読解除

#### `app/(tabs)/index.tsx`
- テーブル一覧画面でリアルタイム同期を実装
- INSERT/UPDATE/DELETEイベントを監視
- 自動的に画面を更新

#### `app/order.tsx`
- 注文画面でリアルタイム同期を実装
- 注文の追加・削除を監視
- 注文履歴を自動更新

### ステップ3️⃣: 動作確認

1. **2台の端末でアプリを開く**
   - 携帯A: Expo GOでアプリを開く
   - 携帯B: 別の端末でExpo GOでアプリを開く

2. **携帯Aでテーブルを使用開始**
   - テーブルを選択
   - 注文を追加
   - 注文確定

3. **携帯Bで確認**
   - 自動的にテーブルが「使用中」に変わる ✅
   - 注文内容が表示される ✅
   - 合計金額が同期される ✅

4. **携帯Aで会計完了**
   - 支払いボタンをタップ
   - 会計完了

5. **携帯Bで確認**
   - テーブルが「空席」に戻る ✅

## 🔍 トラブルシューティング

### 問題1: リアルタイム同期が動作しない

**原因**: Supabaseでリアルタイム機能が有効になっていない

**解決方法**:
1. Supabase管理画面の「Database」→「Replication」を確認
2. 各テーブルがリアルタイムレプリケーションに含まれているか確認
3. `REPLICA IDENTITY FULL` が設定されているか確認

### 問題2: 接続エラーが表示される

**原因**: RLSポリシーが正しく設定されていない

**解決方法**:
```sql
-- RLSポリシーを確認
SELECT * FROM pg_policies WHERE tablename IN ('tables', 'orders');

-- 必要に応じてポリシーを再作成
-- 詳細は 20251018_enable_realtime.sql を参照
```

### 問題3: 一部の変更のみ同期される

**原因**: 一部のテーブルでリアルタイムが無効

**解決方法**:
- すべての関連テーブル（tables, orders, menu_items, order_history）でリアルタイムを有効化

### 問題4: 遅延が発生する

**原因**: ネットワーク接続が不安定

**解決方法**:
- Wi-Fi接続を確認
- Supabaseプロジェクトのリージョンを確認（日本に近いリージョンを選択）

## 📊 監視とデバッグ

### コンソールログで状態確認

アプリのコンソールログで以下のメッセージを確認できます：

```
📡 テーブルのリアルタイム購読を開始...
📡 購読状態: SUBSCRIBED
📡 テーブル変更を検知: UPDATE { id: "...", status: "occupied", ... }
🔄 テーブル更新: T1 状態: occupied
✅ テーブル状態更新完了
```

### Supabase管理画面で確認

1. **Logs → Realtime**
   - リアルタイムメッセージの送受信を確認
   - エラーログを確認

2. **Database → Tables**
   - データが正しく更新されているか確認

## 🎉 成功の確認

以下のシナリオがすべて動作すれば成功です：

- ✅ 携帯Aでテーブルを使用開始 → 携帯Bで即座に「使用中」表示
- ✅ 携帯Aで注文追加 → 携帯Bの注文画面に即座に反映
- ✅ 携帯Aで会計完了 → 携帯Bでテーブルが「空席」に戻る
- ✅ 携帯Aでテーブル追加 → 携帯Bにテーブルが即座に表示
- ✅ 携帯Aでメニュー変更 → 携帯Bのメニューが即座に更新

## 📚 参考資料

- [Supabase Realtime ドキュメント](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [React Native リアルタイム同期パターン](https://reactnative.dev/docs/network)

## 🆘 サポート

問題が解決しない場合：
1. `SUPABASE_SETUP.md` を確認
2. `.env` ファイルのSupabase設定を確認
3. `node test-supabase-simple.js` で接続テスト実行

---

🍵 **茶茶日和での複数端末運用をサポートします**
