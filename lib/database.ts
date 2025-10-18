import { SupabaseClient } from '@supabase/supabase-js';

export interface Table {
  id: string;
  number: string;
  seats: number;
  status: 'available' | 'occupied';
  customer_count?: number;
  order_start_time?: string;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  table_id?: string;
  menu_item_id?: string;
  quantity: number;
  unit_price: number;
  created_at?: string;
}

export interface OrderHistory {
  id: string;
  table_number: string;
  items: any;
  total_amount: number;
  completed_at?: string;
  deleted_at?: string | null;
}

export class DatabaseService {
  constructor(private supabase: SupabaseClient) {}

  // テーブル操作
  async getTables(): Promise<Table[]> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('*')
      .order('number');
    
    if (error) throw error;
    return data || [];
  }

  async createTable(table: Omit<Table, 'id' | 'created_at' | 'updated_at'>): Promise<Table> {
    const { data, error } = await this.supabase
      .from('tables')
      .insert(table)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateTable(id: string, updates: Partial<Table>): Promise<Table> {
    const { data, error } = await this.supabase
      .from('tables')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTable(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('tables')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // メニュー操作
  async getMenuItems(): Promise<MenuItem[]> {
    const { data, error } = await this.supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createMenuItem(item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> {
    const { data, error } = await this.supabase
      .from('menu_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    const { data, error } = await this.supabase
      .from('menu_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteMenuItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('menu_items')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  }

  // 注文操作
  async getOrdersByTable(tableId: string): Promise<Order[]> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createOrder(order: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .insert(order)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteOrder(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async deleteOrdersByTable(tableId: string): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .delete()
      .eq('table_id', tableId);
    
    if (error) throw error;
  }

  // 注文履歴操作（論理削除されていないもののみ取得）
  async getOrderHistory(): Promise<OrderHistory[]> {
    const { data, error } = await this.supabase
      .from('order_history')
      .select('*')
      .is('deleted_at', null)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createOrderHistory(history: Omit<OrderHistory, 'id' | 'completed_at' | 'deleted_at'>): Promise<OrderHistory> {
    const { data, error } = await this.supabase
      .from('order_history')
      .insert(history)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 注文履歴の論理削除
  async softDeleteOrderHistory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('order_history')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  // 初期データの投入（必要な場合のみ）
  async seedInitialData(): Promise<void> {
    try {
      console.log('初期データ投入を開始...');
      // テーブルの存在確認のみ行う（データは投入しない）
      await this.testConnection();
      console.log('初期データ投入完了（テーブル確認のみ）');
    } catch (error) {
      console.error('初期データ投入エラー:', error);
      throw error;
    }
  }

  // モックデータの移行（削除予定のメソッド）
  async migrateMockDataToSupabase(mockTables: any[], mockMenuItems: any[], mockOrderHistory: any[]): Promise<void> {
    console.warn('migrateMockDataToSupabase is deprecated and will be removed');
    // 何もしない（モックデータ移行は削除）
  }

  async testConnection(): Promise<void> {
    try {
      const { data: testData, error: testError } = await this.supabase
        .from('menu_items')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Supabase接続テストエラー:', testError);
        throw new Error(`Supabase接続エラー: ${testError.message}`);
      }
      console.log('Supabase接続テスト成功');
    } catch (error) {
      console.error('Supabase接続に失敗:', error);
      throw error;
    }
  }
}