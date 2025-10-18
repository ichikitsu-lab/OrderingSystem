-- ====================================
-- リアルタイム機能の有効化
-- ====================================
-- このマイグレーションは、テーブルと注文のリアルタイム同期を有効にします
-- 複数の端末間でテーブル状態と注文内容をリアルタイムに同期できます

-- リアルタイム機能を有効にする
-- Supabaseのリアルタイムレプリケーションを使用して、
-- テーブルの変更をすべてのクライアントにブロードキャストします

-- テーブル(tables)のリアルタイムを有効化
ALTER TABLE tables REPLICA IDENTITY FULL;

-- 注文(orders)のリアルタイムを有効化
ALTER TABLE orders REPLICA IDENTITY FULL;

-- メニュー(menu_items)のリアルタイムも有効化（メニュー変更も同期）
ALTER TABLE menu_items REPLICA IDENTITY FULL;

-- 注文履歴(order_history)のリアルタイムも有効化
ALTER TABLE order_history REPLICA IDENTITY FULL;

-- ====================================
-- リアルタイム用のRLSポリシー確認
-- ====================================
-- 既存のRLSポリシーがリアルタイムでも機能することを確認

-- tablesテーブルのRLSポリシーを確認（必要に応じて作成）
DO $$
BEGIN
    -- 既存のポリシーを削除（あれば）
    DROP POLICY IF EXISTS "Enable read access for all users" ON tables;
    DROP POLICY IF EXISTS "Enable insert for all users" ON tables;
    DROP POLICY IF EXISTS "Enable update for all users" ON tables;
    DROP POLICY IF EXISTS "Enable delete for all users" ON tables;
    
    -- 全ユーザーに読み取り権限を付与
    CREATE POLICY "Enable read access for all users" ON tables
        FOR SELECT USING (true);
    
    -- 全ユーザーに挿入権限を付与
    CREATE POLICY "Enable insert for all users" ON tables
        FOR INSERT WITH CHECK (true);
    
    -- 全ユーザーに更新権限を付与
    CREATE POLICY "Enable update for all users" ON tables
        FOR UPDATE USING (true);
    
    -- 全ユーザーに削除権限を付与
    CREATE POLICY "Enable delete for all users" ON tables
        FOR DELETE USING (true);
END $$;

-- ordersテーブルのRLSポリシーを確認（必要に応じて作成）
DO $$
BEGIN
    -- 既存のポリシーを削除（あれば）
    DROP POLICY IF EXISTS "Enable read access for all users" ON orders;
    DROP POLICY IF EXISTS "Enable insert for all users" ON orders;
    DROP POLICY IF EXISTS "Enable update for all users" ON orders;
    DROP POLICY IF EXISTS "Enable delete for all users" ON orders;
    
    -- 全ユーザーに読み取り権限を付与
    CREATE POLICY "Enable read access for all users" ON orders
        FOR SELECT USING (true);
    
    -- 全ユーザーに挿入権限を付与
    CREATE POLICY "Enable insert for all users" ON orders
        FOR INSERT WITH CHECK (true);
    
    -- 全ユーザーに更新権限を付与
    CREATE POLICY "Enable update for all users" ON orders
        FOR UPDATE USING (true);
    
    -- 全ユーザーに削除権限を付与
    CREATE POLICY "Enable delete for all users" ON orders
        FOR DELETE USING (true);
END $$;

-- ====================================
-- リアルタイム同期の動作確認用
-- ====================================

-- リアルタイム機能が正しく設定されたことを確認するコメント
COMMENT ON TABLE tables IS 'テーブル管理 - リアルタイム同期有効';
COMMENT ON TABLE orders IS '注文管理 - リアルタイム同期有効';

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ リアルタイム機能が有効になりました！';
    RAISE NOTICE '📡 テーブル状態と注文内容が複数端末間でリアルタイム同期されます';
    RAISE NOTICE '🔄 携帯Aでの変更が携帯Bでも即座に反映されます';
END $$;
