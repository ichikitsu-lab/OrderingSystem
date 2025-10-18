import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Calendar, TrendingUp, DollarSign, ShoppingBag, ArrowLeft, Download, X, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useDatabase } from '@/hooks/useDatabase';

const { width } = Dimensions.get('window');

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  tableNumber?: string;
  table_number?: string;
  timestamp?: string;
  completed_at?: string;
  items: OrderItem[];
  total?: number;
  total_amount?: number;
}

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

interface ProductSalesData {
  name: string;
  count: number;
  revenue: number;
}

export default function AnalyticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { database, isConnected } = useDatabase();
  const router = useRouter();

  useEffect(() => {
    loadOrderHistory();
  }, [database]);

  const loadOrderHistory = async () => {
    setIsLoading(true);
    try {
      if (database && isConnected) {
        const dbHistory = await database.getOrderHistory();
        const formattedHistory: Order[] = dbHistory.map(item => ({
          id: item.id.toString(),
          table_number: item.table_number,
          items: item.items,
          total_amount: item.total_amount,
          completed_at: item.completed_at || new Date().toISOString(),
        }));
        setOrderHistory(formattedHistory);
      } else if ((global as any).getOrderHistory) {
        const globalHistory = (global as any).getOrderHistory() || [];
        setOrderHistory(globalHistory);
      }
    } catch (error) {
      console.error('注文履歴読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOrderHistory = (): Order[] => {
    return orderHistory;
  };

  // 利用可能な月のリストを取得
  const getAvailableMonths = () => {
    const orderHistory = getOrderHistory();
    const months = new Set<string>();
    orderHistory.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.completed_at || '');
      const month = orderDate.toISOString().substring(0, 7);
      months.add(month);
    });
    return Array.from(months).sort().reverse();
  };

  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-');
    return `${year}年${parseInt(monthNum)}月`;
  };

  // 日次データを取得
  const getDailyData = (): SalesData[] => {
    const orderHistory = getOrderHistory();
    const dailyMap = new Map<string, { sales: number; orders: number }>();

    orderHistory.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.completed_at || '');
      const dateKey = orderDate.toISOString().substring(0, 10);
      const total = order.total || order.total_amount || 0;

      if (dailyMap.has(dateKey)) {
        const existing = dailyMap.get(dateKey)!;
        existing.sales += total;
        existing.orders += 1;
      } else {
        dailyMap.set(dateKey, { sales: total, orders: 1 });
      }
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // 月次データを取得
  const getMonthlyData = (): SalesData[] => {
    const orderHistory = getOrderHistory();
    const monthlyMap = new Map<string, { sales: number; orders: number }>();

    orderHistory.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.completed_at || '');
      const monthKey = orderDate.toISOString().substring(0, 7);
      const total = order.total || order.total_amount || 0;

      if (monthlyMap.has(monthKey)) {
        const existing = monthlyMap.get(monthKey)!;
        existing.sales += total;
        existing.orders += 1;
      } else {
        monthlyMap.set(monthKey, { sales: total, orders: 1 });
      }
    });

    return Array.from(monthlyMap.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // 年次データを取得（期間指定可能）
  const getYearlyData = (): SalesData[] => {
    const orderHistory = getOrderHistory();
    let filteredOrders = orderHistory;

    // 期間フィルタを適用
    if (startMonth && endMonth) {
      filteredOrders = orderHistory.filter((order) => {
        const orderDate = new Date(order.timestamp || order.completed_at || '');
        const orderMonth = orderDate.toISOString().substring(0, 7);
        return orderMonth >= startMonth && orderMonth <= endMonth;
      });
    }

    const yearlyMap = new Map<string, { sales: number; orders: number }>();

    filteredOrders.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.completed_at || '');
      const yearKey = orderDate.getFullYear().toString();
      const total = order.total || order.total_amount || 0;

      if (yearlyMap.has(yearKey)) {
        const existing = yearlyMap.get(yearKey)!;
        existing.sales += total;
        existing.orders += 1;
      } else {
        yearlyMap.set(yearKey, { sales: total, orders: 1 });
      }
    });

    return Array.from(yearlyMap.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // 商品ごとの売上データを取得
  const getProductSalesData = (): ProductSalesData[] => {
    const orderHistory = getOrderHistory();
    const productMap = new Map<string, { count: number; revenue: number }>();

    orderHistory.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          if (productMap.has(item.name)) {
            const existing = productMap.get(item.name)!;
            existing.count += item.quantity;
            existing.revenue += item.price * item.quantity;
          } else {
            productMap.set(item.name, {
              count: item.quantity,
              revenue: item.price * item.quantity,
            });
          }
        });
      }
    });

    return Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getCurrentData = () => {
    switch (selectedPeriod) {
      case 'daily':
        return getDailyData();
      case 'monthly':
        return getMonthlyData();
      case 'yearly':
        return getYearlyData();
      default:
        return [];
    }
  };

  const getTotalSales = () => {
    return getCurrentData().reduce((total, item) => total + item.sales, 0);
  };

  const getTotalOrders = () => {
    return getCurrentData().reduce((total, item) => total + item.orders, 0);
  };

  const getAverageOrderValue = () => {
    const totalSales = getTotalSales();
    const totalOrders = getTotalOrders();
    return totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
  };

  const maxSales = Math.max(...getCurrentData().map((item) => item.sales), 1);

  // CSVデータを生成する関数（現在の表示期間を使用）
  const generateCsvData = () => {
    const currentData = getCurrentData();
    const orderHistory = getOrderHistory();
    let filteredHistory = [...orderHistory];

    // 現在の表示期間に基づいてフィルタ
    if (currentData.length > 0) {
      const dates = currentData.map(item => item.date);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      
      filteredHistory = filteredHistory.filter((order) => {
        const orderDate = new Date(order.timestamp || order.completed_at || '');
        let dateKey = '';
        
        if (selectedPeriod === 'daily') {
          dateKey = orderDate.toISOString().substring(0, 10);
        } else if (selectedPeriod === 'monthly') {
          dateKey = orderDate.toISOString().substring(0, 7);
        } else if (selectedPeriod === 'yearly') {
          dateKey = orderDate.getFullYear().toString();
        }
        
        return dateKey >= minDate && dateKey <= maxDate;
      });
    }

    // CSVヘッダー
    const headers = [
      '注文ID',
      'テーブル番号',
      '注文日時',
      '商品名',
      '数量',
      '単価',
      '小計',
      '合計金額',
    ];

    // CSVデータを構築
    let csvData = headers.join(',') + '\n';

    filteredHistory.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.completed_at || '');
      const formattedDate =
        orderDate.toLocaleDateString('ja-JP') + ' ' + orderDate.toLocaleTimeString('ja-JP');

      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
          const row = [
            order.id,
            order.tableNumber || order.table_number,
            formattedDate,
            `"${item.name}"`, // 商品名をクォートで囲む
            item.quantity,
            item.price,
            item.price * item.quantity,
            index === 0 ? order.total || order.total_amount : '', // 合計は最初の行のみ表示
          ];
          csvData += row.join(',') + '\n';
        });
      } else {
        // アイテムがない場合の行
        const row = [
          order.id,
          order.tableNumber || order.table_number,
          formattedDate,
          '"データなし"',
          0,
          0,
          0,
          order.total || order.total_amount,
        ];
        csvData += row.join(',') + '\n';
      }
    });

    return csvData;
  };

  // CSVファイルをダウンロードする関数（現在の表示期間を使用）
  const downloadCsv = async () => {
    try {
      setIsGeneratingCsv(true);

      const csvData = generateCsvData();

      // ファイル名を生成
      const now = new Date();
      const dateString = now.toISOString().substring(0, 10);
      let periodLabel = '';

      if (selectedPeriod === 'daily') {
        periodLabel = '日次';
      } else if (selectedPeriod === 'monthly') {
        periodLabel = '月次';
      } else if (selectedPeriod === 'yearly') {
        if (startMonth && endMonth) {
          periodLabel = `年次_${formatMonthLabel(startMonth)}-${formatMonthLabel(endMonth)}`;
        } else {
          periodLabel = '年次';
        }
      }

      const fileName = `茶茶日和_注文履歴_${periodLabel}_${dateString}.csv`;

      if (Platform.OS === 'web') {
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Alert.alert('成功', `CSVファイル "${fileName}" をダウンロードしました`);
      } else {
        try {
          const fileUri = FileSystem.cacheDirectory + fileName;
          const bom = '\uFEFF';

          await FileSystem.writeAsStringAsync(fileUri, bom + csvData, {
            encoding: 'utf8',
          });

          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'text/csv',
              dialogTitle: '注文履歴CSVをエクスポート',
              UTI: 'public.comma-separated-values-text',
            });
            Alert.alert('成功', `CSVファイル "${fileName}" を生成しました`);
          } else {
            Alert.alert('エラー', '共有機能が利用できません');
          }
        } catch (fsError) {
          console.error('ファイルシステムエラー:', fsError);
          throw fsError;
        }
      }
    } catch (error) {
      console.error('CSV生成エラー:', error);
      Alert.alert('エラー', 'CSVファイルの生成に失敗しました');
    } finally {
      setIsGeneratingCsv(false);
    }
  };

  const handleCsvDownload = async () => {
    const orderHistory = getOrderHistory();
    if (orderHistory.length === 0) {
      Alert.alert('データなし', '注文履歴がありません。CSVファイルを生成できません。');
      return;
    }

    const currentData = getCurrentData();
    if (currentData.length === 0) {
      Alert.alert('データなし', '現在の表示期間にはデータがありません。');
      return;
    }

    await downloadCsv();
  };

  const renderChart = () => {
    const data = getCurrentData();

    if (data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>売上推移</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>データがありません</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>売上推移</Text>
        <View style={styles.chart}>
          {data.slice(-7).map((item, index) => {
            const height = (item.sales / maxSales) * 150;
            let label = '';

            if (selectedPeriod === 'daily') {
              const date = new Date(item.date);
              label = `${date.getMonth() + 1}/${date.getDate()}`;
            } else if (selectedPeriod === 'monthly') {
              const [year, month] = item.date.split('-');
              label = `${parseInt(month)}月`;
            } else {
              label = `${item.date}年`;
            }

            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View
                    style={[styles.bar, { height: Math.max(height, 5), backgroundColor: '#8B4513' }]}
                  />
                </View>
                <Text style={styles.barLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderProductSales = () => {
    const productData = getProductSalesData();

    if (productData.length === 0) {
      return null;
    }

    return (
      <View style={styles.productSalesSection}>
        <Text style={styles.sectionTitle}>商品別売上</Text>
        {productData.slice(0, 10).map((product, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productCount}>{product.count}個</Text>
            </View>
            <Text style={styles.productRevenue}>¥{product.revenue.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>売上分析</Text>
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={handleCsvDownload}
          disabled={isGeneratingCsv}
        >
          <Download size={24} color={isGeneratingCsv ? "#CCCCCC" : "#FFFFFF"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'daily' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('daily')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'daily' && styles.periodButtonTextActive,
              ]}
            >
              日次
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'monthly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('monthly')}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'monthly' && styles.periodButtonTextActive,
              ]}
            >
              月次
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'yearly' && styles.periodButtonActive]}
            onPress={() => {
              setSelectedPeriod('yearly');
              if (!startMonth || !endMonth) {
                setShowDateRangeModal(true);
              }
            }}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'yearly' && styles.periodButtonTextActive,
              ]}
            >
              年次
            </Text>
          </TouchableOpacity>
        </View>

        {selectedPeriod === 'yearly' && startMonth && endMonth && (
          <View style={styles.dateRangeInfo}>
            <Text style={styles.dateRangeText}>
              期間: {formatMonthLabel(startMonth)} 〜 {formatMonthLabel(endMonth)}
            </Text>
            <TouchableOpacity onPress={() => setShowDateRangeModal(true)}>
              <Text style={styles.changeRangeButton}>変更</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <DollarSign size={24} color="#8B4513" />
              <Text style={styles.cardTitle}>総売上</Text>
            </View>
            <Text style={styles.cardValue}>¥{getTotalSales().toLocaleString()}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <ShoppingBag size={24} color="#8B4513" />
              <Text style={styles.cardTitle}>注文数</Text>
            </View>
            <Text style={styles.cardValue}>{getTotalOrders().toLocaleString()}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <TrendingUp size={24} color="#8B4513" />
              <Text style={styles.cardTitle}>平均単価</Text>
            </View>
            <Text style={styles.cardValue}>¥{getAverageOrderValue().toLocaleString()}</Text>
          </View>
        </View>

        {renderChart()}

        {renderProductSales()}

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>詳細データ</Text>
          {getCurrentData().length === 0 ? (
            <Text style={styles.noDataText}>データがありません</Text>
          ) : (
            getCurrentData().map((item, index) => {
              let label = '';

              if (selectedPeriod === 'daily') {
                const date = new Date(item.date);
                label = date.toLocaleDateString('ja-JP');
              } else if (selectedPeriod === 'monthly') {
                label = formatMonthLabel(item.date);
              } else {
                label = `${item.date}年`;
              }

              return (
                <View key={index} style={styles.detailItem}>
                  <Text style={styles.detailDate}>{label}</Text>
                  <View style={styles.detailStats}>
                    <Text style={styles.detailSales}>¥{item.sales.toLocaleString()}</Text>
                    <Text style={styles.detailOrders}>{item.orders}件</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 年次期間選択モーダル */}
      <Modal
        visible={showDateRangeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateRangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>年次レポート期間設定</Text>
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setShowDateRangeModal(false)}
              >
                <X size={20} color="#8B4513" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateRangeForm}>
              <Text style={styles.formDescription}>
                年次レポートの開始月と終了月を選択してください
              </Text>

              <Text style={styles.inputLabel}>開始月</Text>
              <ScrollView style={styles.monthSelectionList}>
                {getAvailableMonths().map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthSelectionOption,
                      startMonth === month && styles.monthSelectionOptionSelected,
                    ]}
                    onPress={() => setStartMonth(month)}
                  >
                    <Calendar size={20} color={startMonth === month ? '#FFFFFF' : '#8B4513'} />
                    <Text
                      style={[
                        styles.monthSelectionText,
                        startMonth === month && styles.monthSelectionTextSelected,
                      ]}
                    >
                      {formatMonthLabel(month)}
                    </Text>
                    {startMonth === month && <View style={styles.selectedIndicator} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>終了月</Text>
              <ScrollView style={styles.monthSelectionList}>
                {getAvailableMonths().map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthSelectionOption,
                      endMonth === month && styles.monthSelectionOptionSelected,
                    ]}
                    onPress={() => setEndMonth(month)}
                  >
                    <Calendar size={20} color={endMonth === month ? '#FFFFFF' : '#8B4513'} />
                    <Text
                      style={[
                        styles.monthSelectionText,
                        endMonth === month && styles.monthSelectionTextSelected,
                      ]}
                    >
                      {formatMonthLabel(month)}
                    </Text>
                    {endMonth === month && <View style={styles.selectedIndicator} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveButton, (!startMonth || !endMonth) && styles.saveButtonDisabled]}
                onPress={() => {
                  if (startMonth && endMonth) {
                    if (startMonth > endMonth) {
                      Alert.alert('エラー', '開始月は終了月より前である必要があります');
                      return;
                    }
                    setShowDateRangeModal(false);
                  }
                }}
                disabled={!startMonth || !endMonth}
              >
                <Text style={styles.saveButtonText}>設定</Text>
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
  downloadButton: {
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
  content: {
    flex: 1,
    padding: 15,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodButtonActive: {
    backgroundColor: '#8B4513',
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  dateRangeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#333333',
  },
  changeRangeButton: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
  },
  summaryCards: {
    marginBottom: 25,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 10,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 20,
    backgroundColor: '#8B4513',
    borderRadius: 2,
  },
  barLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  noDataContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#999999',
  },
  productSalesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  productCount: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailDate: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  detailStats: {
    alignItems: 'flex-end',
  },
  detailSales: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  detailOrders: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
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
    width: '95%',
    maxWidth: 500,
    maxHeight: '85%',
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
  modalHeaderButton: {
    backgroundColor: '#F5E6D3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateRangeForm: {
    paddingVertical: 10,
  },
  formDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
    marginTop: 10,
  },
  monthSelectionList: {
    maxHeight: 200,
    marginVertical: 10,
  },
  monthSelectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  monthSelectionOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  monthSelectionText: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  monthSelectionTextSelected: {
    color: '#FFFFFF',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 0.45,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});
