import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Plus, Users, Clock, CircleCheck as CheckCircle, Circle as XCircle, CreditCard as Edit, Trash2, Menu, UtensilsCrossed, ClipboardList, TrendingUp, X, Settings, Calendar, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '@/hooks/useDatabase';
import { Table as DBTable } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Table {
  id: string;
  number: string;
  seats: number;
  status: 'available' | 'occupied';
  orderStartTime?: Date;
  customerCount?: number;
  orders: CartItem[];
  totalAmount: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

// モックデータを削除し、空の配列から開始

export default function TablesScreen() {
  const { database, isLoading, error, isConnected } = useDatabase();
  const [tables, setTables] = useState<Table[]>([]);
  const [storeName, setStoreName] = useState('茶茶日和');
  // モックデータ判定フラグを削除
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableSeats, setNewTableSeats] = useState('');
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const router = useRouter();

  // 店舗名をグローバル状態から読み込み
  React.useEffect(() => {
    const loadStoreName = async () => {
      try {
        // AsyncStorageから店舗名を読み込み
        const savedStoreName = await AsyncStorage.getItem('store_name');
        if (savedStoreName) {
          setStoreName(savedStoreName);
          // グローバル状態も更新
          if ((global as any).setStoreName) {
            (global as any).setStoreName(savedStoreName);
          }
        } else {
          // 初期値を設定
          const defaultName = '茶茶日和';
          setStoreName(defaultName);
          await AsyncStorage.setItem('store_name', defaultName);
          if ((global as any).setStoreName) {
            (global as any).setStoreName(defaultName);
          }
        }
      } catch (error) {
        console.error('店舗名読み込みエラー:', error);
        // エラー時は初期値を設定
        const defaultName = '茶茶日和';
        setStoreName(defaultName);
      }
    };

    loadStoreName();

    // グローバル状態の変更を監視
    const interval = setInterval(() => {
      if ((global as any).getStoreName) {
        const globalStoreName = (global as any).getStoreName();
        if (globalStoreName && globalStoreName !== storeName) {
          setStoreName(globalStoreName);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // データベース接続状態の確認
  React.useEffect(() => {
    if (!isLoading && !isConnected) {
      Alert.alert(
        'データベース接続エラー',
        error || 'データベースに接続できません。.envファイルのSupabase設定を確認してください。',
        [
          { text: 'OK' },
          { 
            text: '設定画面へ', 
            onPress: () => router.push('/settings')
          }
        ]
      );
    }
  }, [isConnected, isLoading, error]);

  // データベースからテーブル一覧を読み込み
  const loadTables = async () => {
    if (!database) return;
    
    try {
      console.log('📊 Supabaseからテーブルデータを読み込み中...');
      const dbTables = await database.getTables();
      console.log('📊 読み込み完了:', dbTables.length, '件のテーブル');
      const formattedTables: Table[] = dbTables.map(table => ({
        id: table.id,
        number: table.number,
        seats: table.seats,
        status: table.status,
        orderStartTime: table.order_start_time ? new Date(table.order_start_time) : undefined,
        customerCount: table.customer_count || undefined,
        orders: [], // 注文は別途読み込み
        totalAmount: table.total_amount,
      }));
      setTables(formattedTables);
      console.log('✅ テーブル状態更新完了');
    } catch (error) {
      console.error('テーブル読み込みエラー:', error);
      Alert.alert('エラー', 'テーブルデータの読み込みに失敗しました');
    }
  };

  // データベース接続時にテーブルを読み込み
  React.useEffect(() => {
    if (database) {
      console.log('✅ データベース接続確認 - Supabaseデータを読み込み中...');
      loadTables();
    } else {
      console.log('⚠️ データベース未接続 - 設定を確認してください');
    }
  }, [database]);

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return '#10B981'; // Green
      case 'occupied':
        return '#EF4444'; // Red
      default:
        return '#8B4513';
    }
  };

  const getStatusText = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return '空席';
      case 'occupied':
        return '使用中';
      default:
        return '';
    }
  };

  const getElapsedTime = (startTime?: Date) => {
    if (!startTime) return '';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
    return `${elapsed}分`;
  };

  const handleTablePress = (table: Table) => {
    if (table.status === 'available') {
      // 空席の場合は注文画面に遷移
      router.push(`/order?tableId=${table.id}&tableNumber=${table.number}`);
    } else if (table.status === 'occupied') {
      // 使用中の場合も注文画面に遷移（既存の注文が表示される）
      router.push(`/order?tableId=${table.id}&tableNumber=${table.number}`);
    }
  };

  const handleTableLongPress = (table: Table) => {
    if (table.status === 'available') {
      Alert.alert(
        `テーブル ${table.number}`,
        '何をしますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'テーブル名変更',
            onPress: () => {
              setEditingTable(table);
              setShowEditModal(true);
            },
          },
          {
            text: 'テーブル削除',
            style: 'destructive',
            onPress: () => deleteTable(table.id),
          },
        ]
      );
    } else if (table.status === 'occupied') {
      Alert.alert(
        `テーブル ${table.number}`,
        '何をしますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'テーブル名変更',
            onPress: () => {
              setEditingTable(table);
              setShowEditModal(true);
            },
          },
          {
            text: 'テーブル削除（強制）',
            style: 'destructive',
            onPress: () => forceDeleteTable(table.id),
          },
        ]
      );
    }
  };

  const finishOrder = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.orders.length === 0) {
      Alert.alert(
        '注文なし',
        'このテーブルには注文がありません。テーブルを空席に戻しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '空席に戻す',
            onPress: async () => {
              try {
                await updateTableStatus(tableId, 'available');
                Alert.alert('完了', 'テーブルを空席に戻しました');
              } catch (error) {
                console.error('テーブル状態更新エラー:', error);
                Alert.alert('エラー', 'テーブル状態の更新に失敗しました');
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      '💳 支払い確認',
      `テーブル: ${table.number}\n\n注文内容:\n${table.orders.map(item => `・${item.name} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}`).join('\n')}\n\n合計金額: ¥${table.totalAmount.toLocaleString()}\n\n会計を完了しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '支払い完了',
          onPress: async () => {
            console.log('💳 支払い処理開始 - テーブルID:', tableId);
            console.log('💳 データベース接続状態:', isConnected ? '接続済み' : '未接続');
            console.log('💳 使用データ: Supabaseデータ');
            
            try {
              // 注文履歴データを準備
              const orderHistoryItem = {
                id: Date.now().toString(),
                tableNumber: table.number,
                items: table.orders.map(order => ({
                  name: order.name,
                  quantity: order.quantity,
                  price: order.price
                })),
                total: table.totalAmount,
                timestamp: new Date(),
              };
              
              if (database && isConnected) {
                console.log('💾 データベースに注文履歴を保存中...');
                await database.createOrderHistory({
                  table_number: table.number,
                  items: orderHistoryItem.items,
                  total_amount: table.totalAmount,
                });
                console.log('✅ Supabase注文履歴保存完了');
                
                console.log('🔄 データベースでテーブルを空席に戻し中...');
                await database.updateTable(tableId, {
                  status: 'available',
                  customer_count: 0,
                  order_start_time: null,
                  total_amount: 0,
                });
                console.log('✅ データベーステーブル状態更新完了');
              } else {
                console.log('⚠️ データベース未接続 - ローカル処理のみ');
              }
              
              // 注文履歴に保存（ローカル用）
              console.log('📝 ローカル注文履歴に保存中...');
              setOrderHistory(prev => [...prev, orderHistoryItem]);
              console.log('✅ ローカル履歴保存完了');
              
              // ローカルテーブル状態を更新（空席に戻す）
              console.log('🔄 ローカルテーブル状態更新中...');
              setTables(prevTables => {
                const updatedTables = prevTables.map(t => 
                  t.id === tableId 
                    ? { ...t, status: 'available' as const, orders: [], totalAmount: 0, orderStartTime: undefined, customerCount: undefined }
                    : t
                );
                console.log('✅ ローカルテーブル状態更新完了 - 空席に戻りました');
                return updatedTables;
              });
              
              // 支払い完了後の確認
              console.log('🎉 支払い処理完了');
              Alert.alert(
                '支払い完了',
                `🎉 テーブル ${table.number}の会計が完了しました！\n\n💰 合計金額: ¥${table.totalAmount.toLocaleString()}\n📝 注文履歴に保存されました\n🔄 テーブルが空席に戻りました`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('❌ 支払い処理エラー:', error);
              Alert.alert(
                'エラー', 
                `❌ 支払い処理中にエラーが発生しました:\n\n${error instanceof Error ? error.message : '不明なエラー'}`
              );
            }
          },
        },
      ]
    );
  };

  const saveOrderHistory = async (table: Table) => {
    if (!database) return;
    
    try {
      await database.createOrderHistory({
        table_number: table.number,
        items: table.orders.map(order => ({
          name: order.name,
          quantity: order.quantity,
          price: order.price
        })),
        total_amount: table.totalAmount,
      });
    } catch (error) {
      console.error('注文履歴保存エラー:', error);
      throw error;
    }
  };

  const deleteTableFromDB = async (tableId: string) => {
    if (database) {
      try {
        await database.deleteTable(tableId);
      } catch (error) {
        console.error('テーブル削除エラー:', error);
      }
    }
    // ローカル状態も更新
    setTables(prevTables => prevTables.filter(t => t.id !== tableId));
  };

  const forceDeleteTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    Alert.alert(
      '強制削除の確認',
      `⚠️ 警告: このテーブルは使用中です！\n\nテーブル: ${table.number}\n状態: ${getStatusText(table.status)}\n注文数: ${table.orders.length}件\n合計金額: ¥${table.totalAmount.toLocaleString()}\n\n注文データは失われます。本当に削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '強制削除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('強制削除開始:', tableId);
              await deleteTableFromDB(tableId);
              console.log('強制削除完了');
              Alert.alert('完了', 'テーブルが強制削除されました');
            } catch (error) {
              console.error('強制削除エラー:', error);
              Alert.alert('エラー', '強制削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const deleteTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.status === 'occupied') {
      Alert.alert(
        '削除不可', 
        `このテーブルは現在使用中のため削除できません。\n\n理由: テーブル状態が「${getStatusText(table.status)}」\n注文数: ${table.orders.length}件\n合計金額: ¥${table.totalAmount.toLocaleString()}\n\n先に支払いを完了してから削除してください。`
      );
      return;
    }

    Alert.alert(
      'テーブル削除',
      `${table.number}を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await deleteTableFromDB(tableId);
            Alert.alert('完了', 'テーブルが削除されました');
          },
        },
      ]
    );
  };

  const updateTableName = () => {
    if (!editingTable || !editingTable.number.trim()) {
      Alert.alert('エラー', 'テーブル名を入力してください');
      return;
    }

    // テーブル名の重複チェック
    const existingTable = tables.find(t => t.id !== editingTable.id && t.number === editingTable.number.trim());
    if (existingTable) {
      Alert.alert('エラー', 'このテーブル名は既に使用されています');
      return;
    }
    updateTableInDB(editingTable.id, { number: editingTable.number });
    setShowEditModal(false);
    setEditingTable(null);
    Alert.alert('成功', 'テーブル名が変更されました');
  };

  const updateTableStatus = async (tableId: string, status: Table['status'], additionalUpdates?: Partial<Table>) => {
    const updates = { status, ...additionalUpdates };
    await updateTableInDB(tableId, updates);
  };

  const updateTableInDB = async (tableId: string, updates: Partial<Table>) => {
    console.log('🔄 テーブル更新開始 - ID:', tableId, 'Updates:', updates);
    
    if (database && isConnected) {
      try {
        console.log('💾 Supabaseでテーブル更新中...');
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.number) dbUpdates.number = updates.number;
        if (updates.customerCount !== undefined) dbUpdates.customer_count = updates.customerCount;
        if (updates.orderStartTime) dbUpdates.order_start_time = updates.orderStartTime.toISOString();
        if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
        
        await database.updateTable(tableId, dbUpdates);
        console.log('✅ Supabase更新完了');
      } catch (error) {
        console.error('❌ Supabaseテーブル更新エラー:', error);
        throw error;
      }
    } else {
      console.log('⚠️ データベース未接続 - ローカル更新のみ');
    }
    
    // ローカル状態も更新
    console.log('🔄 ローカル状態更新中...');
    setTables(prevTables =>
      prevTables.map(t =>
        t.id === tableId ? { ...t, ...updates } : t
      )
    );
    console.log('✅ ローカル状態更新完了');
  };

  const addNewTable = () => {
    if (!newTableNumber || !newTableSeats) {
      Alert.alert('エラー', 'テーブル番号と席数を入力してください');
      return;
    }

    addTableToDB({
      number: newTableNumber,
      seats: parseInt(newTableSeats),
    });
    
    setNewTableNumber('');
    setNewTableSeats('');
    setShowAddModal(false);
    Alert.alert('成功', '新しいテーブルが追加されました');
  };

  const addTableToDB = async (tableData: { number: string; seats: number }) => {
    if (database) {
      try {
        const newTable = await database.createTable({
          number: tableData.number,
          seats: tableData.seats,
          status: 'available',
          total_amount: 0,
        });
        
        // ローカル状態に追加
        const formattedTable: Table = {
          id: newTable.id.toString(),
          number: newTable.number,
          seats: newTable.seats,
          status: newTable.status,
          orders: [],
          totalAmount: newTable.total_amount,
        };
        
        setTables(prev => [...prev, formattedTable]);
        return;
      } catch (error) {
        console.error('テーブル追加エラー:', error);
      }
    }
    
    // データベース接続がない場合はローカルのみ
    const newTable: Table = {
      id: `table-${Date.now()}`,
      number: tableData.number,
      seats: tableData.seats,
      status: 'available',
      orders: [],
      totalAmount: 0,
    };
    setTables(prev => [...prev, newTable]);
  };

  const getStatusStats = () => {
    const stats = tables.reduce((acc, table) => {
      acc[table.status] = (acc[table.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      available: stats.available || 0,
      occupied: stats.occupied || 0,
    };
  };

  const stats = getStatusStats();

  // フィルタリングされたテーブル一覧を取得
  const getFilteredTables = () => {
    if (selectedFilter === 'all') {
      return tables;
    }
    
    const filtered = tables.filter(table => table.status === selectedFilter);
    const others = tables.filter(table => table.status !== selectedFilter);
    
    return [...filtered, ...others];
  };

  const filteredTables = getFilteredTables();

  // テーブルの注文を更新する関数をグローバルに公開
  React.useEffect(() => {
    (global as any).updateTableStatus = async (tableId: string, status: string, additionalUpdates?: any) => {
      await updateTableStatus(tableId, status as Table['status'], additionalUpdates);
    };
    
    (global as any).updateTableOrder = (tableId: string, orders: CartItem[], totalAmount: number) => {
      updateTableInDB(tableId, { orders, totalAmount });
    };
    
    (global as any).getTableOrders = (targetTableId: string) => {
      const table = tables.find(t => t.id === targetTableId);
      return table ? table.orders : [];
    };
    
    (global as any).completePayment = async (tableId: string, orderData: any) => {
      console.log('completePayment called with tableId:', tableId);
      
      try {
        const table = tables.find(t => t.id === tableId);
        if (table && database) {
          console.log('データベースに注文履歴を保存中...');
          await saveOrderHistory(table);
          console.log('注文履歴保存完了');
        }
        
        // 注文履歴に追加
        console.log('Adding to order history:', orderData);
        setOrderHistory(prev => [...prev, orderData]);
        
        // テーブルを削除
        console.log('テーブル削除開始...');
        await deleteTableFromDB(tableId);
        console.log('テーブル削除完了');
      } catch (error) {
        console.error('支払い完了処理エラー:', error);
        throw error;
      }
    };
    
    (global as any).getOrderHistory = () => orderHistory;
    
    (global as any).getAllTables = () => tables;
    
    // 店舗名管理関数
    (global as any).getStoreName = () => storeName;
    (global as any).setStoreName = (newName: string) => {
      setStoreName(newName);
    };
    
    // 注文履歴管理関数
    (global as any).addOrderHistory = (orderHistoryItem: any) => {
      setOrderHistory(prev => [...prev, orderHistoryItem]);
    };
  }, [tables, orderHistory, database]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{storeName}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.connectionText}>
            {isConnected ? '🟢 DB接続' : '🔴 ローカル'}
          </Text>
          <Text style={styles.dataSourceText}>
            Supabaseデータ
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setShowHamburgerMenu(true)}
          >
            <Menu size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statItem, selectedFilter === 'available' && styles.statItemActive]}
          onPress={() => setSelectedFilter(selectedFilter === 'available' ? 'all' : 'available')}
        >
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.available}</Text>
          <Text style={styles.statLabel}>空席</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.statItem, selectedFilter === 'occupied' && styles.statItemActive]}
          onPress={() => setSelectedFilter(selectedFilter === 'occupied' ? 'all' : 'occupied')}
        >
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.occupied}</Text>
          <Text style={styles.statLabel}>使用中</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => router.push('/calendar')}
        >
          <Text style={[styles.statNumber, { color: '#8B4513' }]}>📅</Text>
          <Text style={styles.calendarButtonText}>予約</Text>
        </TouchableOpacity>
      </View>

      {selectedFilter !== 'all' && (
        <View style={styles.filterIndicator}>
          <Text style={styles.filterText}>
            {selectedFilter === 'available' ? '空席' : 
             '使用中'}のテーブルを表示中
          </Text>
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={styles.clearFilterText}>すべて表示</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.tablesContainer}>
        <View style={styles.tablesGrid}>
          {filteredTables.map((table, index) => (
            <TouchableOpacity
              key={table.id}
              style={[
                styles.tableCard,
                { borderColor: getStatusColor(table.status) },
                selectedFilter !== 'all' && table.status === selectedFilter && styles.priorityCard
              ]}
              onPress={() => handleTablePress(table)}
              onLongPress={() => handleTableLongPress(table)}
              delayLongPress={500}
              activeOpacity={0.7}
            >
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(table.status) }]}>
                {table.status === 'available' && <CheckCircle size={16} color="#FFFFFF" />}
                {table.status === 'occupied' && <XCircle size={16} color="#FFFFFF" />}
              </View>
              
              <Text style={styles.tableNumber}>{table.number}</Text>
              <Text style={styles.tableSeats}>{table.seats}席</Text>
              <Text style={[styles.tableStatus, { color: getStatusColor(table.status) }]}>
                {getStatusText(table.status)}
              </Text>
              
              {table.status === 'occupied' && (
                <View style={styles.occupiedInfo}>
                  <Text style={styles.customerCount}>
                    {table.customerCount}名
                  </Text>
                  <Text style={styles.elapsedTime}>
                    {getElapsedTime(table.orderStartTime)}
                  </Text>
                  <Text style={styles.tableAmount}>
                    ¥{table.totalAmount.toLocaleString()}
                  </Text>
                </View>
              )}
              
              {/* PC用の設定ボタンを追加 */}
              <TouchableOpacity
                style={styles.tableSettingsButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleTableLongPress(table);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Edit size={24} color="#8B4513" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>新しいテーブルを追加</Text>
            
            <TextInput
              style={styles.input}
              placeholder="テーブル番号 (例: T9)"
              value={newTableNumber}
              onChangeText={setNewTableNumber}
            />
            
            <TextInput
              style={styles.input}
              placeholder="席数"
              keyboardType="numeric"
              value={newTableSeats}
              onChangeText={setNewTableSeats}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={addNewTable}
              >
                <Text style={styles.saveButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>テーブル名を変更</Text>
            
            <TextInput
              style={styles.input}
              placeholder="テーブル番号"
              value={editingTable?.number || ''}
              onChangeText={(text) => setEditingTable(prev => prev ? { ...prev, number: text } : null)}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingTable(null);
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={updateTableName}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHamburgerMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowHamburgerMenu(false)}
      >
        <View style={styles.hamburgerOverlay}>
          <View style={styles.hamburgerContent}>
            <View style={styles.hamburgerHeader}>
              <Text style={styles.hamburgerTitle}>メニュー</Text>
              <TouchableOpacity
                style={styles.hamburgerCloseButton}
                onPress={() => setShowHamburgerMenu(false)}
              >
                <X size={24} color="#8B4513" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.hamburgerItems}>
              <TouchableOpacity
                style={styles.hamburgerItem}
                onPress={() => {
                  setShowHamburgerMenu(false);
                  router.push('/menu');
                }}
              >
                <UtensilsCrossed size={24} color="#8B4513" />
                <Text style={styles.hamburgerItemText}>メニュー管理</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.hamburgerItem}
                onPress={() => {
                  setShowHamburgerMenu(false);
                  router.push('/order-history');
                }}
              >
                <ClipboardList size={24} color="#8B4513" />
                <Text style={styles.hamburgerItemText}>注文履歴</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.hamburgerItem}
                onPress={() => {
                  setShowHamburgerMenu(false);
                  router.push('/calendar');
                }}
              >
                <Calendar size={24} color="#8B4513" />
                <Text style={styles.hamburgerItemText}>予約カレンダー</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.hamburgerItem}
                onPress={() => {
                  setShowHamburgerMenu(false);
                  router.push('/analytics');
                }}
              >
                <TrendingUp size={24} color="#8B4513" />
                <Text style={styles.hamburgerItemText}>売上分析</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.hamburgerItem}
                onPress={() => {
                  setShowHamburgerMenu(false);
                  router.push('/settings');
                }}
              >
                <Settings size={24} color="#8B4513" />
                <Text style={styles.hamburgerItemText}>設定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  header: {
    backgroundColor: '#8B4513',
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dataSourceText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  statItemActive: {
    backgroundColor: '#F5E6D3',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  calendarButton: {
    flex: 1.2,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5E6D3',
  },
  calendarButtonText: {
    fontSize: 12,
    color: '#8B4513',
    marginTop: 4,
    fontWeight: '600',
  },
  filterIndicator: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
  },
  clearFilterButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearFilterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tablesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  priorityCard: {
    borderWidth: 3,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  statusIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  tableSeats: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  tableStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  occupiedInfo: {
    marginTop: 5,
  },
  customerCount: {
    fontSize: 12,
    color: '#666666',
  },
  elapsedTime: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  tableAmount: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: 'bold',
    marginTop: 2,
  },
  tableSettingsButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.45,
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.45,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hamburgerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  hamburgerContent: {
    backgroundColor: '#FFFFFF',
    width: 280,
    height: '100%',
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  hamburgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  hamburgerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  hamburgerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerItems: {
    paddingTop: 20,
  },
  hamburgerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  hamburgerItemText: {
    fontSize: 18,
    color: '#333333',
    marginLeft: 16,
    fontWeight: '500',
  },
  tableManagementModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableManagementContent: {
    padding: 20,
  },
  tableInfoSection: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  tableInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  tableInfoText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 5,
  },
  managementActions: {
    gap: 12,
  },
  managementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  managementButtonText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    color: '#DC2626',
  },
});