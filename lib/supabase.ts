import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 環境変数からSupabase設定を取得
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase環境変数が設定されていません。.envファイルを確認してください。');
}

// Supabaseクライアントを初期化
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getSupabase = () => {
  return supabase;
};

// 後方互換性のための関数（既存のコードがある場合に備えて）
export const initializeSupabase = async (url?: string, anonKey?: string) => {
  console.warn('initializeSupabase is deprecated. Supabase is now configured with embedded settings.');
  return supabase;
};

export const loadSupabaseConfig = async () => {
  return supabase;
};

export const isSupabaseConfigured = async () => {
  return true;
};

export const clearSupabaseConfig = async () => {
  console.warn('clearSupabaseConfig is no longer needed. Supabase is configured with embedded settings.');
};