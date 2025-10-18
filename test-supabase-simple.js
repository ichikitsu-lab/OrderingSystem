#!/usr/bin/env node

// シンプルなSupabase接続テスト（環境変数を使用）
const { createClient } = require('@supabase/supabase-js');

// 環境変数を直接使用（.envファイルを読み込まない）
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://txbrrqdebofybvmgrwcq.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YnJycWRlYm9meWJ2bWdyd2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MzY4NjgsImV4cCI6MjA3NjAxMjg2OH0.tn8Zi6-0XlmvlIIy5yjA-RQFLGcXcKguPmjYCYX2XUw';

console.log('=== シンプルSupabase接続テスト ===');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '未設定');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBasicConnection() {
  try {
    console.log('\n🔍 基本接続テスト実行中...');
    
    // 複数のテーブルを試す
    const testTables = ['tables', 'menu_items', 'orders', 'order_history'];
    
    for (const tableName of testTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: 接続OK (${count}件のデータ)`);
          if (data && data.length > 0) {
            console.log(`   サンプル:`, Object.keys(data[0]));
          }
        }
      } catch (err) {
        console.log(`⚠️  ${tableName}: ${err.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ 接続テストエラー:', error);
    return false;
  }
}

// アプリケーション内での使用を想定したテスト
async function testAppUsage() {
  console.log('\n📱 アプリケーション使用テスト...');
  
  try {
    // 1. メニューアイテムの取得を試す
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true);
    
    if (menuError) {
      console.log('❌ メニュー取得エラー:', menuError.message);
    } else {
      console.log('✅ メニュー取得成功:', menuItems ? menuItems.length : 0, '件');
    }
    
    // 2. テーブル一覧の取得を試す  
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .order('number');
    
    if (tablesError) {
      console.log('❌ テーブル取得エラー:', tablesError.message);
    } else {
      console.log('✅ テーブル取得成功:', tables ? tables.length : 0, '件');
    }
    
  } catch (error) {
    console.error('❌ アプリケーションテストエラー:', error);
  }
}

async function main() {
  const isConnected = await testBasicConnection();
  if (isConnected) {
    await testAppUsage();
  }
  
  console.log('\n🎯 結論:');
  if (isConnected) {
    console.log('✅ Supabaseデータベースに接続できています');
    console.log('💡 次のステップ:');
    console.log('   1. Expo GOでアプリを起動');
    console.log('   2. アプリ内でデータベース機能をテスト');
    console.log('   3. テーブル作成・メニュー管理などを確認');
  } else {
    console.log('❌ Supabaseデータベースに接続できません');
    console.log('💡 対処方法:');
    console.log('   1. SUPABASE_SETUP.mdの手順を実行');
    console.log('   2. Supabase管理画面でテーブルを作成');
    console.log('   3. RLSポリシーを設定');
  }
}

main();