import { useEffect, useState, useRef } from 'react';
import { useSupabase } from './useSupabase';
import { DatabaseService } from '@/lib/database';

export const useDatabase = () => {
  const { supabase, isLoading: supabaseLoading } = useSupabase();
  const [database, setDatabase] = useState<DatabaseService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const initDatabase = async () => {
      try {
        console.log('データベース初期化開始...');
        if (supabase) {
          console.log('Supabaseクライアントが利用可能です');
          const db = new DatabaseService(supabase);
          // 初期データを投入
          await db.seedInitialData();
          if (isMountedRef.current) {
            setDatabase(db);
            setError(null);
          }
          console.log('データベース初期化完了');
        } else {
          console.log('Supabaseクライアントが利用できません');
          if (isMountedRef.current) {
            setDatabase(null);
          }
        }
      } catch (err) {
        console.error('Database initialization error:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'データベース初期化エラー');
          setDatabase(null);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    if (!supabaseLoading) {
      initDatabase().catch((err) => {
        console.error('Failed to initialize database:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'データベース初期化に失敗しました');
          setIsLoading(false);
        }
      });
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [supabase, supabaseLoading]);

  const migrateMockData = async (mockTables: any[], mockMenuItems: any[], mockOrderHistory: any[]) => {
    if (!database) {
      throw new Error('データベースが初期化されていません');
    }
    
    try {
      await database.migrateMockDataToSupabase(mockTables, mockMenuItems, mockOrderHistory);
      if (isMountedRef.current) {
        setMigrationCompleted(true);
      }
      return true;
    } catch (error) {
      console.error('モックデータ移行エラー:', error);
      throw error;
    }
  };
  return { 
    database, 
    isLoading: isLoading || supabaseLoading, 
    error,
    isConnected: !!database,
    migrateMockData,
    migrationCompleted
  };
};