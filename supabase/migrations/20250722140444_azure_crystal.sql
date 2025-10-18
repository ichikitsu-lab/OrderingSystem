/*
  # 開発環境用RLS無効化

  開発段階でのテスト用にRow Level Securityを一時的に無効化します。
  本番環境では適切なRLSポリシーを設定してください。

  1. RLS無効化
    - `tables` テーブル
    - `menu_items` テーブル  
    - `orders` テーブル
    - `order_history` テーブル

  注意: 本番環境では必ずRLSを有効化し、適切なポリシーを設定してください。
*/

-- 開発環境用: RLSを無効化
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_history DISABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Public access for tables" ON tables;
DROP POLICY IF EXISTS "Authenticated users can manage tables" ON tables;
DROP POLICY IF EXISTS "Public access for menu_items" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users can manage menu items" ON menu_items;
DROP POLICY IF EXISTS "Public access for orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON orders;
DROP POLICY IF EXISTS "Public access for order_history" ON order_history;
DROP POLICY IF EXISTS "Authenticated users can view order history" ON order_history;