import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { Plus, Minus, ArrowLeft, ChevronDown, CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/hooks/useDatabase';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
  isDeleted?: boolean;
}

interface CartItem extends MenuItem {
  quantity: number;
}


export default function OrderScreen() {
  const { database, isConnected } = useDatabase();
  const [confirmedOrders, setConfirmedOrders] = useState<CartItem[]>([]); // 注文履歴
  const [pendingOrders, setPendingOrders] = useState<CartItem[]>([]); // 追加注文（未確定）
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [unavailableItems, setUnavailableItems] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { tableId, tableNumber } = useLocalSearchParams();
  const currentTableId = tableId as string;

  // 初期メニューデータ
  const initialMenuItems: MenuItem[] = [
    {
      id: 'teishoku-1',
      name: '本日の日替わり定食',
      price: 980,
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300',
      category: '定食',
      description: '季節の食材を使った栄養バランスの良い定食',
    },
    {
      id: 'teishoku-2',
      name: '鶏の唐揚げ定食',
      price: 850,
      image: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=300',
      category: '定食',
      description: 'ジューシーな鶏の唐揚げとご飯、味噌汁、小鉢のセット',
    },
    {
      id: 'teishoku-3',
      name: '焼き魚定食',
      price: 920,
      image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300',
      category: '定食',
      description: '新鮮な魚の塩焼きとご飯、味噌汁、小鉢のセット',
    },
    {
      id: 'drink-1',
      name: '緑茶',
      price: 200,
      image: 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300',
      category: 'ドリンク',
      description: '香り高い緑茶',
    },
    {
      id: 'drink-2',
      name: 'ほうじ茶',
      price: 200,
      image: 'https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=300',
      category: 'ドリンク',
      description: '香ばしいほうじ茶',
    },
    {
      id: 'dessert-1',
      name: 'わらび餅',
      price: 380,
      image: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=300',
      category: 'デザート',
      description: 'なめらかなわらび餅',
    },
  ];

  // グローバル状態からメニューを読み込み
  const loadMenuItems = async () => {
    console.log('📱 注文画面: メニュー読み込み開始');
    
    if (database && isConnected) {
      try {
        console.log('💾 データベースからメニュー読み込み');
        const items = await database.getMenuItems();
        const formattedItems: MenuItem[] = items.map(item => ({
          id: item.id.toString(),
          name: item.name,
          price: item.price,
          image: item.image_url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=300',
          category: item.category,
          description: item.description,
        }));
        setMenuItems(formattedItems);
        console.log('💾 データベースメニュー読み込み完了:', formattedItems.length, '件');
      } catch (error) {
        console.error('メニュー読み込みエラー:', error);
      }
    } else {
      // グローバル状態からメニューを読み込み
      console.log('🌐 グローバル状態からメニュー読み込み');
      const globalMenuItems = (global as any).globalMenuItems;
      if (globalMenuItems) {
        // 削除されていないメニューのみを表示
        const activeMenuItems = globalMenuItems.filter((item: any) => !item.isDeleted);
        setMenuItems(activeMenuItems);
        console.log('🌐 グローバルメニュー読み込み完了:', activeMenuItems.length, '件');
      } else {
        // グローバル状態にメニューがない場合は初期メニューを使用
        console.log('🌐 グローバル状態にメニューなし - 初期メニューを使用');
        setMenuItems(initialMenuItems);
        // グローバル状態も初期化
        if (typeof global !== 'undefined') {
          (global as any).globalMenuItems = [...initialMenuItems];
        }
      }
    }
    
    // 提供停止項目も読み込み
    const globalUnavailableItems = (global as any).globalUnavailableItems;
    if (globalUnavailableItems) {
      setUnavailableItems(new Set(globalUnavailableItems));
      console.log('🌐 提供停止項目読み込み:', Array.from(globalUnavailableItems));
    }
  };

  useEffect(() => {
    // 初期メニューを即座に設定
    if (menuItems.length === 0) {
      console.log('📱 初期メニューを即座に設定');
      setMenuItems(initialMenuItems);
    }
    
    loadMenuItems();
    
    // 定期的にメニュー状態を更新
    const interval = setInterval(() => {
      loadMenuItems();
    }, 2000); // 2秒ごとに更新
    
    return () => clearInterval(interval);
  }, [database, menuItems.length]);

  // 利用可能なメニューのみをフィルタリング
  const getAvailableMenuItems = () => {
    return menuItems.filter(item => {
      // 削除されたメニューは表示しない
      if (item.isDeleted) return false;
      // 提供停止中のメニューは表示しない
      if (unavailableItems.has(item.id)) return false;
      return true;
    });
  };

  const availableMenuItems = getAvailableMenuItems();

  // テーブルの既存注文を読み込み（注文履歴として表示）
  useEffect(() => {
    if (currentTableId && (global as any).getTableOrders) {
      const existingOrders = (global as any).getTableOrders(currentTableId);
      if (existingOrders && existingOrders.length > 0) {
        setConfirmedOrders(existingOrders);
      }
    }
    
    // 利用可能なテーブル一覧を取得
    if ((global as any).getAllTables) {
      const tables = (global as any).getAllTables();
      setAvailableTables(tables);
    }
  }, [currentTableId]);

  const addToPendingOrders = (item: MenuItem) => {
    // 削除されたメニューや提供停止中のメニューは注文不可
    if (item.isDeleted) {
      Alert.alert('注文不可', 'このメニューは削除されています');
      return;
    }
    
    if (unavailableItems.has(item.id)) {
      Alert.alert('注文不可', 'このメニューは現在提供しておりません');
      return;
    }
    
    setPendingOrders(prevOrders => {
      const existingItem = prevOrders.find(order => order.id === item.id);
      if (existingItem) {
        return prevOrders.map(order =>
          order.id === item.id
            ? { ...order, quantity: order.quantity + 1 }
            : order
        );
      } else {
        return [...prevOrders, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromPendingOrders = (id: string) => {
    setPendingOrders(prevOrders => {
      return prevOrders.reduce((acc, item) => {
        if (item.id === id) {
          if (item.quantity > 1) {
            acc.push({ ...item, quantity: item.quantity - 1 });
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as CartItem[]);
    });
  };

  const getPendingTotal = () => {
    return pendingOrders.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getConfirmedTotal = () => {
    return confirmedOrders.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalAmount = () => {
    return getConfirmedTotal() + getPendingTotal();
  };

  const confirmPendingOrders = () => {
    if (pendingOrders.length === 0) {
      Alert.alert('エラー', '追加する注文がありません');
      return;
    }
    
    Alert.alert(
      '注文確定',
      `以下の注文を確定しますか？\n\n${pendingOrders.map(item => `・${item.name} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}`).join('\n')}\n\n追加金額: ¥${getPendingTotal().toLocaleString()}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '確定',
          onPress: async () => {
            try {
              console.log('📝 追加注文確定処理開始...');
              
              // 注文履歴に追加
              const updatedConfirmedOrders = [...confirmedOrders];
              
              // 既存の注文と統合
              pendingOrders.forEach(pendingItem => {
                const existingIndex = updatedConfirmedOrders.findIndex(item => item.id === pendingItem.id);
                if (existingIndex >= 0) {
                  updatedConfirmedOrders[existingIndex].quantity += pendingItem.quantity;
                } else {
                  updatedConfirmedOrders.push(pendingItem);
                }
              });
              
              setConfirmedOrders(updatedConfirmedOrders);
              
              // データベースに注文を保存
              if (database && isConnected) {
                console.log('💾 Supabaseに追加注文を保存中...');
                for (const item of pendingOrders) {
                  await database.createOrder({
                    table_id: currentTableId,
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                  });
                }
                
                // テーブル状態を更新
                await database.updateTable(currentTableId, {
                  status: 'occupied',
                  customer_count: 1,
                  order_start_time: new Date().toISOString(),
                  total_amount: getConfirmedTotal() + getPendingTotal(),
                });
                console.log('✅ Supabase注文保存完了');
              } else {
                console.log('⚠️ データベース未接続 - ローカル処理のみ');
              }
              
              // グローバル関数でローカル状態も更新
              if ((global as any).updateTableOrder) {
                (global as any).updateTableOrder(currentTableId, updatedConfirmedOrders, getConfirmedTotal() + getPendingTotal());
              }
              
              if ((global as any).updateTableStatus) {
                (global as any).updateTableStatus(currentTableId, 'occupied', {
                  orderStartTime: new Date(),
                  customerCount: 1
                });
              }
              
              // 追加注文をクリア
              setPendingOrders([]);
              
              Alert.alert(
                '注文確定完了',
                `🎉 テーブル ${tableNumber}の追加注文が確定されました！\n\n📝 ${pendingOrders.length}品目の追加注文\n💰 追加金額: ¥${getPendingTotal().toLocaleString()}\n\n支払いは注文画面の支払いボタンから行えます。`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('❌ 注文確定エラー:', error);
              Alert.alert(
                'エラー',
                `注文確定中にエラーが発生しました:\n\n${error instanceof Error ? error.message : '不明なエラー'}\n\n接続状態: ${isConnected ? '🟢 データベース連携' : '🔴 ローカルのみ'}`
              );
            }
          },
        },
      ]
    );
  };

  const switchToTable = (newTableId: string, newTableNumber: string) => {
    setShowTableSelector(false);
    router.replace(`/order?tableId=${newTableId}&tableNumber=${newTableNumber}`);
  };

  const categories = ['定食', 'ドリンク', 'デザート'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tableSelector}
          onPress={() => setShowTableSelector(true)}
        >
          <View style={styles.tableSelectorContent}>
            <Text style={styles.headerTitle}>
              テーブル {tableNumber} - 注文
            </Text>
            <ChevronDown size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected ? '🟢 データベース連携' : '🔴 ローカルデータ'} • 利用可能メニュー: {availableMenuItems.length}件 • 提供停止: {unavailableItems.size}件
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 注文履歴 */}
        {confirmedOrders.length > 0 && (
          <View style={styles.confirmedOrdersSection}>
            <View style={styles.sectionHeader}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>注文履歴</Text>
            </View>
            <View style={styles.ordersList}>
              {confirmedOrders.map(item => (
                <View key={`confirmed-${item.id}`} style={styles.confirmedOrderItem}>
                  <Text style={styles.confirmedItemName}>{item.name}</Text>
                  <Text style={styles.confirmedItemQuantity}>× {item.quantity}</Text>
                  <Text style={styles.confirmedItemPrice}>¥{(item.price * item.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.confirmedTotal}>
                <Text style={styles.confirmedTotalText}>履歴合計: ¥{getConfirmedTotal().toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 追加注文セクション */}
        <View style={styles.addOrderSection}>
          <View style={styles.sectionHeader}>
            <Plus size={20} color="#8B4513" />
            <Text style={styles.sectionTitle}>
              {confirmedOrders.length > 0 ? '追加注文' : '注文'}
            </Text>
          </View>

          {/* メニュー一覧 */}
          <View style={styles.menuSection}>
            {categories.map(category => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {availableMenuItems
                  .filter(item => item.category === category)
                  .map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuItem}
                      onPress={() => addToPendingOrders(item)}
                    >
                      <Image source={{ uri: item.image }} style={styles.menuImage} />
                      <View style={styles.menuInfo}>
                        <Text style={styles.menuName}>{item.name}</Text>
                        <Text style={styles.menuCategory}>{item.category}</Text>
                        <Text style={styles.menuPrice}>¥{item.price}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => addToPendingOrders(item)}
                      >
                        <Plus size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 追加注文カート */}
      {pendingOrders.length > 0 && (
        <View style={styles.pendingOrdersSection}>
          <View style={styles.pendingHeader}>
            <Clock size={16} color="#F59E0B" />
            <Text style={styles.pendingTitle}>追加注文 ({pendingOrders.length}品目)</Text>
            <Text style={styles.pendingTotal}>¥{getPendingTotal().toLocaleString()}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pendingItems}>
            {pendingOrders.map(item => (
              <View key={`pending-${item.id}`} style={styles.pendingItem}>
                <Text style={styles.pendingItemName}>{item.name}</Text>
                <View style={styles.pendingItemControls}>
                  <TouchableOpacity
                    style={styles.pendingItemButton}
                    onPress={() => removeFromPendingOrders(item.id)}
                  >
                    <Minus size={12} color="#8B4513" />
                  </TouchableOpacity>
                  <Text style={styles.pendingItemQuantity}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.pendingItemButton}
                    onPress={() => addToPendingOrders(item)}
                  >
                    <Plus size={12} color="#8B4513" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={confirmPendingOrders}
          >
            <CheckCircle size={20} color="#FFFFFF" />
            <Text style={styles.confirmButtonText}>注文確定</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 支払い用固定フッター */}
      {confirmedOrders.length > 0 && (
        <View style={styles.paymentFooter}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTableText}>テーブル {tableNumber}</Text>
            <Text style={styles.paymentTotalText}>合計: ¥{getTotalAmount().toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => {
              console.log('💳 支払い画面へ遷移 - テーブルID:', currentTableId, 'テーブル番号:', tableNumber);
              router.push(`/payment?tableId=${currentTableId}&tableNumber=${tableNumber}`);
            }}
          >
            <Text style={styles.paymentButtonText}>支払い</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* テーブル選択モーダル */}
      <Modal
        visible={showTableSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTableSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>テーブルを選択</Text>
            <ScrollView style={styles.tableList}>
              {availableTables.map(table => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableOption,
                    table.id === currentTableId && styles.currentTableOption
                  ]}
                  onPress={() => switchToTable(table.id, table.number)}
                >
                  <View style={styles.tableOptionInfo}>
                    <Text style={[
                      styles.tableOptionName,
                      table.id === currentTableId && styles.currentTableText
                    ]}>
                      {table.number}
                    </Text>
                    <Text style={[
                      styles.tableOptionStatus,
                      table.id === currentTableId && styles.currentTableText
                    ]}>
                      {table.status === 'available' ? '空席' : 
                       table.status === 'occupied' ? '使用中' : 
                       table.status === 'reserved' ? '予約済み' : '清掃中'}
                    </Text>
                  </View>
                  {table.totalAmount > 0 && (
                    <Text style={[
                      styles.tableOptionAmount,
                      table.id === currentTableId && styles.currentTableText
                    ]}>
                      ¥{table.totalAmount.toLocaleString()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTableSelector(false)}
            >
              <Text style={styles.closeButtonText}>閉じる</Text>
            </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  tableSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBar: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#8B4513',
    textAlign: 'center',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  confirmedOrdersSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 8,
  },
  ordersList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  confirmedOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  confirmedItemName: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  confirmedItemQuantity: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 10,
  },
  confirmedItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  confirmedTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#10B981',
  },
  confirmedTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'right',
  },
  addOrderSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuSection: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  menuItem: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  menuInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  menuCategory: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  menuPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#8B4513',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingOrdersSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 6,
    flex: 1,
  },
  pendingTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  pendingItems: {
    maxHeight: 80,
    marginBottom: 15,
  },
  pendingItem: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    minWidth: 120,
  },
  pendingItemName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  pendingItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingItemButton: {
    backgroundColor: '#FFFFFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingItemQuantity: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  confirmButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
    textAlign: 'center',
  },
  tableList: {
    maxHeight: 300,
  },
  tableOption: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 15,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentTableOption: {
    backgroundColor: '#8B4513',
  },
  tableOptionInfo: {
    flex: 1,
  },
  tableOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  tableOptionStatus: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  currentTableText: {
    color: '#FFFFFF',
  },
  tableOptionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  closeButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paymentFooter: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTableText: {
    fontSize: 14,
    color: '#666666',
  },
  paymentTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  paymentButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});