# 茶茶日和 - カフェ注文管理システム

和カフェ「茶茶日和」のテーブル注文管理システムです。React Native (Expo) + Supabaseで構築されています。

## 🚀 EXPO GO デプロイメント

### 📋 必要な設定

1. **環境変数の設定**
   ```bash
   # .envファイルが必要です
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxxxxxxx
   ```

2. **Supabaseデータベースのセットアップ**
   - ⚠️ **重要**: Supabaseでテーブルを作成する必要があります
   - 詳細は `SUPABASE_SETUP.md` を参照してください

### 🔧 セットアップ手順

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **Supabase接続テスト**
   ```bash
   # シンプルテスト
   node test-supabase-simple.js
   
   # 詳細テスト
   node test-supabase.js
   ```

3. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

4. **EXPO GOでアクセス**
   - Expo GOアプリでQRコードをスキャン
   - またはブラウザで開発URLにアクセス

### 📱 現在のデプロイメント状況

- ✅ 環境変数設定完了
- ✅ Expoサーバー起動完了
- ⚠️ Supabaseテーブル作成が必要
- 🌐 **開発サーバーURL**: https://8081-impya18f57v4q92f8kduv-2e77fc33.sandbox.novita.ai

## 🗄️ データベース設定

### 🆕 論理削除（Soft Delete）対応

注文の長押しによる論理削除機能に対応しています！

- ✅ データを完全に削除せず、履歴として保持
- ✅ 誤削除からの復元が可能
- ✅ 監査証跡として利用可能

**📖 論理削除の詳細**: [`LOGICAL_DELETE_SETUP.md`](LOGICAL_DELETE_SETUP.md)をご覧ください  
**⚡ クイックスタート**: [`QUICK_START_LOGICAL_DELETE.md`](QUICK_START_LOGICAL_DELETE.md)で5分でセットアップ！

### 必須：Supabaseテーブルの作成

アプリが正常に動作するには、以下のいずれかの方法でテーブルを作成してください：

#### 方法1: 論理削除対応版（推奨）🌟

```bash
# supabase/migrations/20251018_logical_delete_setup.sql を実行
```

このマイグレーションには以下が含まれます：
- 📊 全テーブルに `deleted_at` カラム追加
- 🔍 アクティブレコード用のビュー
- 🛠️ 論理削除・復元用の関数
- 📈 統計・分析用のビュー

#### 方法2: 基本版

```sql
-- テーブル管理
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  seats integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'available',
  customer_count integer DEFAULT 0,
  order_start_time timestamptz,
  total_amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- その他のテーブルは SUPABASE_SETUP.md を参照
```

**📖 完全なセットアップ手順**: `SUPABASE_SETUP.md`をご覧ください

### 接続テスト結果

現在の状況：
- ✅ Supabase API接続：成功
- ❌ テーブルアクセス：テーブルが存在しません
- 💡 対処法：SUPABASE_SETUP.mdの手順に従ってテーブルを作成してください

## 📂 プロジェクト構造

```
/
├── app/                                    # Expoルーター画面
├── lib/                                    # データベース・Supabase設定
├── hooks/                                  # カスタムフック
├── supabase/migrations/                    # データベースマイグレーション
│   └── 20251018_logical_delete_setup.sql  # 論理削除対応版
├── .env                                    # 環境変数（Supabase設定）
├── SUPABASE_SETUP.md                       # 詳細なセットアップ手順
├── LOGICAL_DELETE_SETUP.md                 # 論理削除の完全ガイド
├── QUICK_START_LOGICAL_DELETE.md           # 5分でセットアップ
└── test-supabase*.js                       # 接続テストスクリプト
```

## 🎯 機能

- 📊 テーブル管理（空席・使用中状態）
- 🍵 メニュー注文システム
- 🗑️ **注文長押し削除**（論理削除対応）
- 💰 支払い管理
- 📈 売上分析
- 📅 予約カレンダー
- 📋 注文履歴（削除済みも含む）
- ♻️ 削除した注文の復元機能

## 🛠️ 技術スタック

- **Frontend**: React Native (Expo)
- **Backend**: Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth（匿名アクセス対応）
- **Deployment**: Expo GO

## 📞 サポート

セットアップで問題が発生した場合：

1. `SUPABASE_SETUP.md`の手順を確認
2. `node test-supabase-simple.js`で接続テスト
3. Supabase管理画面でテーブルの存在を確認
4. RLSポリシーの設定を確認

---

🍵 **茶茶日和での素敵なひとときをサポートします**
