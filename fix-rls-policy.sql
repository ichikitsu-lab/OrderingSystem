-- 匿名ユーザーでもアクセス可能にするポリシーを追加
-- （開発/デモ環境用）

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can manage tables" ON tables;
DROP POLICY IF EXISTS "Authenticated users can manage menu items" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can view order history" ON order_history;

-- 匿名ユーザーを含むすべてのユーザーがアクセス可能なポリシーを作成
CREATE POLICY "Allow all access to tables"
  ON tables
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to menu items"
  ON menu_items
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to orders"
  ON orders
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to order history"
  ON order_history
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);