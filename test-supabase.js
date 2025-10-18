#!/usr/bin/env node

// Supabase接続テストスクリプト
const { createClient } = require('@supabase/supabase-js');

// .envファイルを読み込む
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Supabase 接続テスト ===');
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '未設定');
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '未設定');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません。.envファイルを確認してください。');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  try {
    console.log('\n🔍 接続テスト中...');
    
    // 基本的な接続テスト（直接データベースアクセスを試す）
    console.log('Supabase Client接続確認中...');
    
    // テーブル構造の確認
    console.log('\n📋 データベーステーブル確認中...');
    
    const tables = ['tables', 'menu_items', 'orders', 'order_history'];
    let successCount = 0;
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`⚠️  ${tableName}: ${error.message}`);
          
          // RLSエラーの場合は特別な処理
          if (error.message.includes('RLS') || error.message.includes('policy')) {
            console.log(`   💡 ${tableName}: RLS (Row Level Security) ポリシーが設定されています`);
            console.log(`   💡 匿名アクセスが制限されている可能性があります`);
          }
        } else {
          console.log(`✅ ${tableName}: テーブル確認OK (${data.length}件のデータ)`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ ${tableName}: エラー - ${err.message}`);
      }
    }
    
    console.log(`\n📊 結果: ${successCount}/${tables.length} テーブルにアクセス可能`);
    
    if (successCount === 0) {
      console.log('\n⚠️  全てのテーブルにアクセスできません。');
      console.log('   原因の可能性:');
      console.log('   1. RLS (Row Level Security) ポリシーが制限的');
      console.log('   2. テーブルが存在しない');
      console.log('   3. 権限設定の問題');
      console.log('\n🛠️  解決方法:');
      console.log('   Supabase管理画面で以下のSQLを実行してください:');
      console.log('   fix-rls-policy.sql ファイルの内容を参照');
    }
    
    console.log('\n🎉 テスト完了！');
    return successCount > 0;
    
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    return false;
  }
}

testSupabaseConnection();