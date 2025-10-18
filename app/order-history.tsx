import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { Clock, Receipt, Trash2, RefreshCw, ArrowLeft, CreditCard as Edit, Save, X, Plus, Minus, Search, Filter, Calendar } from 'lucide-react-native';
import { useDatabase } from '@/hooks/useDatabase';
import { useRouter } from 'expo-router';

interface OrderHistoryItem {
  id: string;
  tableNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  timestamp: Date;
}

// モックデータを削除 - Supabaseから実際のデータを読み込み

export default function OrderHistoryScreen() {
  const { database, isConnected } = useDatabase();
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<OrderHistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const router = useRouter();

  // データベースから注文履歴を読み込み
  const loadOrderHistory = async () => {
    if (!database) return;
    
    try {
      setIsRefreshing(true);
      const dbHistory = await database.getOrderHistory();
      const formattedHistory: OrderHistoryItem[] = dbHistory.map(item => ({
       id: item.id.toString(),
        tableNumber: item.table_number,
        items: item.items,
        total: item.total_amount,
        timestamp: new Date(item.completed_at || ''),
      }));
      setOrderHistory(formattedHistory);
    } catch (error) {
      console.error('注文履歴読み込みエラー:', error);
      Alert.alert('エラー', '注文履歴の読み込みに失敗しました');
    } finally {
      setIsRefreshing(false);
    }
  };

  // グローバルな注文履歴も取得
  const loadGlobalOrderHistory = () => {
    console.log('📱 グローバル注文履歴を読み込み中...');
    if ((global as any).getOrderHistory) {
      const globalHistory = (global as any).getOrderHistory();
      console.log('📱 グローバル履歴取得:', globalHistory?.length || 0, '件');
      if (globalHistory && globalHistory.length > 0) {
        setOrderHistory(prev => {
          // 重複を避けるため、IDでフィルタリング
          const existingIds = prev.map(item => item.id);
          const newItems = globalHistory.filter((item: any) => !existingIds.includes(item.id));
          const updatedHistory = [...prev, ...newItems];
          console.log('📱 履歴更新完了:', updatedHistory.length, '件');
          return updatedHistory;
        });
      }
    } else {
      console.log('⚠️ getOrderHistory関数が見つかりません');
    }
  };

  useEffect(() => {
    if (database) {
      loadOrderHistory();
    } else {
      // データベース未接続時はグローバル履歴を確認
      loadGlobalOrderHistory();
    }
  }, [database]);

  // 定期的にグローバル履歴をチェック
  useEffect(() => {
    const interval = setInterval(() => {
      if (!database) {
        loadGlobalOrderHistory();
      }
    }, 2000); // 2秒ごとにチェック

    return () => clearInterval(interval);
  }, [database]);

  const handleRefresh = async () => {
    if (database) {
      await loadOrderHistory();
    } else {
      loadGlobalOrderHistory();
    }
  };

  // 検索とフィルタリング機能
  useEffect(() => {
    let filtered = [...orderHistory];

    // 検索フィルタ
    if (searchQuery.trim()) {
      filtered = filtered.filter(order => 
        order.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // 月フィルタ
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(order => {
        const orderMonth = order.timestamp.toISOString().substring(0, 7); // YYYY-MM
        return orderMonth === selectedMonth;
      });
    }

    // 日付順でソート（新しい順）
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredHistory(filtered);
  }, [orderHistory, searchQuery, selectedMonth]);

  // 利用可能な月のリストを取得
  const getAvailableMonths = () => {
    const months = new Set<string>();
    orderHistory.forEach(order => {
      const month = order.timestamp.toISOString().substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  };

  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-');
    return `${year}年${parseInt(monthNum)}月`;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMonth('all');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteOrder = (orderId: string, tableNumber: string) => {
    Alert.alert(
      '注文履歴を削除',
      `テーブル ${tableNumber} の注文履歴を削除しますか？\n\nこの操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              if (database && isConnected) {
                await database.softDeleteOrderHistory(orderId);
                Alert.alert('削除完了', '注文履歴を削除しました');
                await loadOrderHistory();
              } else {
                Alert.alert('エラー', 'データベースに接続されていません');
              }
            } catch (error) {
              console.error('削除エラー:', error);
              Alert.alert('エラー', '注文履歴の削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>注文履歴</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw 
              size={20} 
              color="#FFFFFF" 
              style={isRefreshing ? { opacity: 0.5 } : {}}
            />
          </TouchableOpacity>
          <Receipt size={24} color="#FFFFFF" />
          {isConnected && <View style={styles.connectedDot} />}
        </View>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected ? '🟢 データベース連携' : '🔴 ローカルデータ'} • {orderHistory.length}件の履歴 • 表示中: {filteredHistory.length}件
        </Text>
        {isRefreshing && <Text style={styles.refreshingText}>更新中...</Text>}
      </View>

      {/* 検索とフィルタ */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8B4513" />
          <TextInput
            style={styles.searchInput}
            placeholder="テーブル名やメニュー名で検索..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <X size={16} color="#666666" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color="#FFFFFF" />
          {selectedMonth !== 'all' && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      {/* アクティブフィルタ表示 */}
      {(searchQuery || selectedMonth !== 'all') && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersLabel}>フィルタ中:</Text>
          {searchQuery && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>検索: "{searchQuery}"</Text>
            </View>
          )}
          {selectedMonth !== 'all' && (
            <View style={styles.activeFilterTag}>
              <Text style={styles.activeFilterText}>{formatMonthLabel(selectedMonth)}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFiltersText}>クリア</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {filteredHistory.length === 0 ? (
          orderHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Receipt size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>注文履歴がありません</Text>
            <TouchableOpacity
              style={styles.refreshEmptyButton}
              onPress={handleRefresh}
            >
              <Text style={styles.refreshEmptyButtonText}>更新</Text>
            </TouchableOpacity>
          </View>
          ) : (
            <View style={styles.emptyState}>
              <Search size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>検索条件に一致する履歴がありません</Text>
              <TouchableOpacity
                style={styles.refreshEmptyButton}
                onPress={clearFilters}
              >
                <Text style={styles.refreshEmptyButtonText}>フィルタをクリア</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          filteredHistory.map(order => (
            <Pressable
              key={order.id}
              onLongPress={() => handleDeleteOrder(order.id, order.tableNumber)}
              delayLongPress={500}
            >
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.tableNumber}>{order.tableNumber}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.timestamp)}</Text>
                </View>

                <View style={styles.orderItems}>
                  {order.items.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>× {item.quantity}</Text>
                      <Text style={styles.itemPrice}>¥{(item.price * item.quantity).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.orderTotal}>
                  <Text style={styles.totalLabel}>合計</Text>
                  <Text style={styles.totalAmount}>¥{order.total.toLocaleString()}</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* フィルタモーダル */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>フィルタ設定</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <X size={20} color="#8B4513" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>月で絞り込み</Text>
              <ScrollView style={styles.monthList}>
                <TouchableOpacity
                  style={[
                    styles.monthOption,
                    selectedMonth === 'all' && styles.monthOptionSelected
                  ]}
                  onPress={() => setSelectedMonth('all')}
                >
                  <Text style={[
                    styles.monthOptionText,
                    selectedMonth === 'all' && styles.monthOptionTextSelected
                  ]}>
                    すべての月
                  </Text>
                </TouchableOpacity>
                
                {getAvailableMonths().map(month => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthOption,
                      selectedMonth === month && styles.monthOptionSelected
                    ]}
                    onPress={() => setSelectedMonth(month)}
                  >
                    <Text style={[
                      styles.monthOptionText,
                      selectedMonth === month && styles.monthOptionTextSelected
                    ]}>
                      {formatMonthLabel(month)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.clearButtonText}>クリア</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>適用</Text>
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
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusBar: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
  },
  refreshingText: {
    fontSize: 12,
    color: '#8B4513',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 20,
    marginBottom: 20,
  },
  refreshEmptyButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshEmptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  orderDate: {
    fontSize: 14,
    color: '#666666',
  },
  orderItems: {
    marginBottom: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#8B4513',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333333',
  },
  clearSearchButton: {
    padding: 4,
  },
  filterButton: {
    backgroundColor: '#8B4513',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
  },
  activeFilterTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  clearFiltersButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  monthList: {
    maxHeight: 200,
  },
  monthOption: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  monthOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  monthOptionText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  monthOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  clearButton: {
    backgroundColor: '#E5E5E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  clearButtonText: {
    color: '#666666',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});