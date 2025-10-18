import { useEffect, useState } from 'react';
import { getSupabase, loadSupabaseConfig } from '@/lib/supabase';

export const useSupabase = () => {
  const [supabase, setSupabase] = useState(getSupabase());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initSupabase = async () => {
      try {
        const client = await loadSupabaseConfig();
        setSupabase(client);
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!supabase) {
      initSupabase().catch((error) => {
        console.error('Failed to initialize Supabase:', error);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  return { supabase, isLoading };
};