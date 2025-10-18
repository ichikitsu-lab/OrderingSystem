import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ArrowLeft, CreditCard, Receipt, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/hooks/useDatabase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export default function PaymentScreen() {
  const { database, isConnected } = useDatabase();
  const [orders, setOrders] = useState<CartItem[]>([]);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const router = useRouter();
  const { tableId, tableNumber } = useLocalSearchParams();
  const currentTableId = tableId as string;
  const currentTableNumber = tableNumber as string;

  // テーブル情報と注文を読み込み
  useEffect(() => {
    console.log('💳 支払い画面初期化 - テーブルID:', currentTableId, 'テーブル番号:', currentTableNumber);
    
    if (currentTableId) {
      // テーブル情報を取得
      if ((global as any).getAllTables) {
        const tables = (global as any).getAllTables();
        const table = tables.find((t: any) => t.id === currentTableId);
        console.log('💳 テーブル情報取得:', table);
        setTableInfo(table);
      }

      // 注文情報を取得
      if ((global as any).getTableOrders) {
        const tableOrders = (global as any).getTableOrders(currentTableId);
        console.log('💳 注文情報取得:', tableOrders);
        if (tableOrders) {
          setOrders(tableOrders);
        }
      }
    } else {
      console.log('❌ テーブルIDが見つかりません');
    }
  }, [currentTableId]);

  const getTotalAmount = () => {
    return orders.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const processPayment = () => {
    const totalOrders = [...orders];
    if (totalOrders.length === 0) {
      Alert.alert('エラー', '支払い対象の注文がありません');
      return;
    }
    
    Alert.alert(
      '💳 支払い確認',
      `テーブル: ${tableNumber}\n\n注文内容:\n${totalOrders.map(item => `・${item.name} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}`).join('\n')}\n\n合計金額: ¥${getTotalAmount().toLocaleString()}\n\n会計を完了しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '支払い完了',
          onPress: async () => {
            console.log('💳 支払い処理開始 - テーブルID:', currentTableId);
            
            try {
              // 注文履歴データを準備
              const orderHistoryItem = {
                id: Date.now().toString(),
                tableNumber: tableNumber as string,
                items: totalOrders.map(order => ({
                  name: order.name,
                  quantity: order.quantity,
                  price: order.price
                })),
                total: getTotalAmount(),
                timestamp: new Date(),
              };
            // 注文履歴をグローバルに追加（重要：支払い完了後のデータ連動）
            console.log('📝 注文履歴をグローバルに追加中...', orderHistoryItem);
              
              if (database && isConnected) {
                console.log('💾 データベースに注文履歴を保存中...');
                await database.createOrderHistory({
                  table_number: currentTableNumber,
                  items: orderHistoryItem.items,
                  total_amount: getTotalAmount(),
                });
                console.log('✅ Supabase注文履歴保存完了');
                
                console.log('🔄 データベースでテーブルを空席に戻し中...');
                await database.updateTable(currentTableId, {
                  status: 'available',
                  customer_count: 0,
                  order_start_time: null,
                  total_amount: 0,
                });
                console.log('✅ データベーステーブル状態更新完了');
              } else {
                console.log('⚠️ データベース未接続 - ローカル処理のみ');
              }
              
              // グローバル関数でローカル状態も更新
              if ((global as any).updateTableStatus) {
                console.log('🔄 ローカルテーブル状態更新中...');
                (global as any).updateTableStatus(currentTableId, 'available', {
                  orders: [],
                  totalAmount: 0,
                  orderStartTime: undefined,
                  customerCount: undefined
                });
                console.log('✅ ローカルテーブル状態更新完了');
              }
              
              // 注文履歴をグローバルに追加
              if ((global as any).addOrderHistory) {
                (global as any).addOrderHistory(orderHistoryItem);
                console.log('✅ グローバル注文履歴追加完了');
              } else {
                console.log('⚠️ addOrderHistory関数が見つかりません');
              }
              
              console.log('🎉 支払い処理完了');
              Alert.alert(
                '支払い完了',
                `🎉 テーブル ${currentTableNumber}の会計が完了しました！\n\n💰 合計金額: ¥${getTotalAmount().toLocaleString()}\n📝 注文履歴に保存されました\n🔄 テーブルが空席に戻りました`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.push('/(tabs)');
                    },
                  },
                ]
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

  const getElapsedTime = () => {
    if (!tableInfo?.orderStartTime) return '';
    const elapsed = Math.floor((Date.now() - tableInfo.orderStartTime.getTime()) / (1000 * 60));
    return `${elapsed}分`;
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
        <Text style={styles.headerTitle}>支払い - テーブル {currentTableNumber}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* テーブル情報 */}
        {tableInfo && (
          <View style={styles.tableInfoSection}>
            <Text style={styles.sectionTitle}>テーブル情報</Text>
            <View style={styles.tableInfoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>テーブル番号:</Text>
                <Text style={styles.infoValue}>{currentTableNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>席数:</Text>
                <Text style={styles.infoValue}>{tableInfo.seats}席</Text>
              </View>
              {tableInfo.customerCount && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>利用人数:</Text>
                  <Text style={styles.infoValue}>{tableInfo.customerCount}名</Text>
                </View>
              )}
              {tableInfo.orderStartTime && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>利用時間:</Text>
                  <Text style={styles.infoValue}>{getElapsedTime()}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 注文内容 */}
        <View style={styles.orderSection}>
          <Text style={styles.sectionTitle}>注文内容</Text>
          {orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Receipt size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>注文がありません</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {orders.map((item, index) => (
                <View key={`${item.id}-${index}`} style={styles.orderItem}>
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName}>{item.name}</Text>
                    <Text style={styles.orderItemCategory}>{item.category}</Text>
                  </View>
                  <View style={styles.orderItemDetails}>
                    <Text style={styles.orderItemQuantity}>× {item.quantity}</Text>
                    <Text style={styles.orderItemPrice}>¥{(item.price * item.quantity).toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 合計金額 */}
        {orders.length > 0 && (
          <View style={styles.totalSection}>
            <View style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>小計</Text>
                <Text style={styles.totalValue}>¥{getTotalAmount().toLocaleString()}</Text>
              </View>
              <View style={[styles.totalRow, styles.finalTotal]}>
                <Text style={styles.finalTotalLabel}>合計</Text>
                <Text style={styles.finalTotalValue}>¥{getTotalAmount().toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 支払いボタン */}
      {orders.length > 0 && (
        <View style={styles.paymentSection}>
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={processPayment}
          >
            <CreditCard size={24} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>
              ¥{getTotalAmount().toLocaleString()} を支払う
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  tableInfoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 10,
  },
  tableInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  orderSection: {
    marginBottom: 20,
  },
  emptyOrders: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
  },
  ordersList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  orderItemCategory: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  orderItemDetails: {
    alignItems: 'flex-end',
  },
  orderItemQuantity: {
    fontSize: 14,
    color: '#666666',
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 2,
  },
  totalSection: {
    marginBottom: 20,
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666666',
  },
  totalValue: {
    fontSize: 16,
    color: '#333333',
  },
  finalTotal: {
    borderTopWidth: 2,
    borderTopColor: '#8B4513',
    marginTop: 10,
    paddingTop: 15,
  },
  finalTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  finalTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  paymentSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  paymentButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});