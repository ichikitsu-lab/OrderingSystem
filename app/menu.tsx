import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Coffee, ArrowLeft, ShoppingCart, Plus, CreditCard as Edit, Trash2, Save, X, Minus, Camera, RotateCcw, Archive } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/hooks/useDatabase';
import * as ImagePicker from 'expo-image-picker';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  isDeleted?: boolean;
  deletedAt?: Date;
}

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

// グローバル状態管理の初期化
const initializeGlobalMenuState = () => {
  if (typeof global !== 'undefined') {
    if (!(global as any).globalMenuItems) {
      (global as any).globalMenuItems = [...initialMenuItems];
      console.log('🌐 グローバルメニュー初期化:', (global as any).globalMenuItems.length, '件');
    }
    if (!(global as any).globalUnavailableItems) {
      (global as any).globalUnavailableItems = new Set<string>();
      console.log('🌐 提供停止リスト初期化');
    }
    if (!(global as any).globalDeletedMenuItems) {
      (global as any).globalDeletedMenuItems = [];
      console.log('🌐 削除済みメニューリスト初期化');
    }
  }
};

// グローバル状態を更新する関数
const updateGlobalMenuItems = (newMenuItems: MenuItem[]) => {
  (global as any).globalMenuItems = [...newMenuItems];
  console.log('🌐 グローバルメニュー更新:', newMenuItems.length, '件');
};

const updateGlobalUnavailableItems = (newUnavailableItems: Set<string>) => {
  (global as any).globalUnavailableItems = new Set(newUnavailableItems);
  console.log('🌐 提供停止リスト更新:', Array.from(newUnavailableItems));
};

const updateGlobalDeletedMenuItems = (newDeletedMenuItems: MenuItem[]) => {
  (global as any).globalDeletedMenuItems = [...newDeletedMenuItems];
  console.log('🌐 削除済みメニューリスト更新:', newDeletedMenuItems.length, '件');
};
export default function MenuScreen() {
  const { database, isConnected } = useDatabase();
  const router = useRouter();
  const { tableId, tableNumber, mode } = useLocalSearchParams();
  
  // グローバル状態を初期化
  React.useEffect(() => {
    initializeGlobalMenuState();
  }, []);

  const [cart, setCart] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    initializeGlobalMenuState();
    return [...((global as any).globalMenuItems || initialMenuItems)];
  });
  const [deletedMenuItems, setDeletedMenuItems] = useState<MenuItem[]>(() => {
    initializeGlobalMenuState();
    return [...((global as any).globalDeletedMenuItems || [])];
  });
  const [categories] = useState(['定食', 'ドリンク', 'デザート']);
  const [unavailableItems, setUnavailableItems] = useState<Set<string>>(() => {
    initializeGlobalMenuState();
    return new Set((global as any).globalUnavailableItems || new Set<string>());
  });
  
  // モーダル状態
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // 新規メニュー項目
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    price: '',
    category: '定食',
    description: '',
    image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=300',
  });

  // 画像選択機能
  const pickImage = async (isEditing: boolean = false) => {
    try {
      // カメラロールの権限をリクエスト
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限が必要です', 'カメラロールへのアクセス権限が必要です');
        return;
      }

      // 画像選択オプション
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📷 画像選択完了:', imageUri);
        
        if (isEditing && editingItem) {
          setEditingItem({...editingItem, image: imageUri});
        } else {
          setNewMenuItem({...newMenuItem, image: imageUri});
        }
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  // カメラで撮影
  const takePhoto = async (isEditing: boolean = false) => {
    try {
      // カメラの権限をリクエスト
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限が必要です', 'カメラへのアクセス権限が必要です');
        return;
      }

      // カメラで撮影
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📸 写真撮影完了:', imageUri);
        
        if (isEditing && editingItem) {
          setEditingItem({...editingItem, image: imageUri});
        } else {
          setNewMenuItem({...newMenuItem, image: imageUri});
        }
      }
    } catch (error) {
      console.error('写真撮影エラー:', error);
      Alert.alert('エラー', '写真の撮影に失敗しました');
    }
  };

  // 画像選択オプションを表示
  const showImageOptions = (isEditing: boolean = false) => {
    Alert.alert(
      '画像を選択',
      '画像の取得方法を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'カメラで撮影', onPress: () => takePhoto(isEditing) },
        { text: 'ギャラリーから選択', onPress: () => pickImage(isEditing) },
      ]
    );
  };

  // グローバル状態から最新データを読み込み
  const loadFromGlobalState = () => {
    console.log('📱 グローバル状態から読み込み開始');
    const globalMenuItems = (global as any).globalMenuItems;
    const globalUnavailableItems = (global as any).globalUnavailableItems;
    const globalDeletedMenuItems = (global as any).globalDeletedMenuItems;
    
    if (globalMenuItems) {
      console.log('📱 グローバルメニュー読み込み:', globalMenuItems.length, '件');
      setMenuItems([...globalMenuItems]);
    }
    if (globalUnavailableItems) {
      console.log('📱 提供停止項目読み込み:', Array.from(globalUnavailableItems));
      setUnavailableItems(new Set(globalUnavailableItems));
    }
    if (globalDeletedMenuItems) {
      console.log('📱 削除済みメニュー読み込み:', globalDeletedMenuItems.length, '件');
      setDeletedMenuItems([...globalDeletedMenuItems]);
    }
  };

  // データベースからメニューを読み込み
  const loadMenuItems = async () => {
    if (!database) return;
    
    try {
      console.log('💾 データベースからメニュー読み込み開始');
      const dbMenuItems = await database.getMenuItems();
      const formattedItems: MenuItem[] = dbMenuItems.map(item => ({
        id: item.id.toString(),
        name: item.name,
        price: item.price,
        image: item.image_url || '',
        category: item.category,
        description: item.description || '',
      }));
      setMenuItems(formattedItems);
      updateGlobalMenuItems(formattedItems);
      console.log('💾 データベースメニュー読み込み完了:', formattedItems.length, '件');
    } catch (error) {
      console.error('メニュー読み込みエラー:', error);
    }
  };

  React.useEffect(() => {
    if (database) {
      loadMenuItems();
    } else {
      loadFromGlobalState();
    }
  }, [database]);

  // 提供状況を切り替える関数
  const toggleAvailability = (itemId: string) => {
    console.log('🔄 提供状況切り替え:', itemId);
    const newUnavailableItems = new Set(unavailableItems);
    
    if (newUnavailableItems.has(itemId)) {
      newUnavailableItems.delete(itemId);
      console.log('✅ 提供開始:', itemId);
    } else {
      newUnavailableItems.add(itemId);
      console.log('❌ 提供停止:', itemId);
    }
    
    setUnavailableItems(newUnavailableItems);
    updateGlobalUnavailableItems(newUnavailableItems);
  };

  // メニュー項目を追加する関数
  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      Alert.alert('エラー', '商品名と価格を入力してください');
      return;
    }

    try {
      const item: MenuItem = {
        id: `menu-${Date.now()}`,
        name: newMenuItem.name,
        price: parseInt(newMenuItem.price),
        category: newMenuItem.category,
        description: newMenuItem.description,
        image: newMenuItem.image,
      };

      console.log('➕ メニュー追加:', item.name);

      if (database && isConnected) {
        await database.createMenuItem({
          name: item.name,
          price: item.price,
          category: item.category,
          description: item.description,
          image_url: item.image,
        });
        await loadMenuItems();
      } else {
        const updatedMenuItems = [...menuItems, item];
        setMenuItems(updatedMenuItems);
        updateGlobalMenuItems(updatedMenuItems);
        console.log('🌐 ローカルメニュー追加完了:', updatedMenuItems.length, '件');
      }

      setNewMenuItem({
        name: '',
        price: '',
        category: categories[0],
        description: '',
        image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=300',
      });
      setShowAddMenuModal(false);
      Alert.alert('成功', '新しいメニュー項目が追加されました');
    } catch (error) {
      console.error('メニュー追加エラー:', error);
      Alert.alert('エラー', 'メニューの追加に失敗しました');
    }
  };

  // メニュー項目を更新する関数
  const updateMenuItem = async () => {
    if (!editingItem || !editingItem.name.trim() || !editingItem.price) {
      Alert.alert('エラー', '商品名と価格を入力してください');
      return;
    }

    try {
      console.log('📝 メニュー更新:', editingItem.name);

      if (database && isConnected) {
        await database.updateMenuItem(editingItem.id, {
          name: editingItem.name,
          price: editingItem.price,
          category: editingItem.category,
          description: editingItem.description,
          image_url: editingItem.image,
        });
        await loadMenuItems();
      } else {
        const updatedMenuItems = menuItems.map(item =>
          item.id === editingItem.id ? editingItem : item
        );
        setMenuItems(updatedMenuItems);
        updateGlobalMenuItems(updatedMenuItems);
        console.log('🌐 ローカルメニュー更新完了');
      }

      setEditingItem(null);
      setShowEditModal(false);
      Alert.alert('成功', 'メニュー項目が更新されました');
    } catch (error) {
      console.error('メニュー更新エラー:', error);
      Alert.alert('エラー', 'メニューの更新に失敗しました');
    }
  };

  // メニュー項目を削除する関数
  const softDeleteMenuItem = (id: string) => {
    const itemToDelete = menuItems.find(item => item.id === id);
    console.log('🗑️ メニュー削除要求:', itemToDelete?.name, id);
    
    Alert.alert(
      'メニューを削除',
      `「${itemToDelete?.name}」を削除しますか？\n\n削除されたメニューはゴミ箱に移動され、後で復元できます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ メニュー削除実行:', id);

              if (!itemToDelete) return;

              // 削除されたアイテムを削除済みリストに追加
              const deletedItem = {
                ...itemToDelete,
                isDeleted: true,
                deletedAt: new Date(),
              };

              if (database && isConnected) {
                // データベースでは論理削除フラグを設定
                await database.updateMenuItem(id, { is_active: false });
                await loadMenuItems();
              } else {
                // ローカル状態から削除してゴミ箱に移動
                const updatedMenuItems = menuItems.filter(item => item.id !== id);
                const updatedDeletedItems = [...deletedMenuItems, deletedItem];
                setMenuItems(updatedMenuItems);
                setDeletedMenuItems(updatedDeletedItems);
                updateGlobalMenuItems(updatedMenuItems);
                updateGlobalDeletedMenuItems(updatedDeletedItems);
                console.log('🌐 ローカルメニュー削除完了:', updatedMenuItems.length, '件');
              }

              // 提供停止リストからも削除
              const newUnavailableItems = new Set(unavailableItems);
              newUnavailableItems.delete(id);
              setUnavailableItems(newUnavailableItems);
              updateGlobalUnavailableItems(newUnavailableItems);

              Alert.alert('削除完了', `「${itemToDelete?.name}」がゴミ箱に移動されました`);
            } catch (error) {
              console.error('メニュー削除エラー:', error);
              Alert.alert('エラー', 'メニューの削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  // カートに追加する関数
  const addToCart = (item: MenuItem) => {
    console.log('🛒 カート追加試行:', item.name, 'ID:', item.id);
    console.log('🛒 現在の提供停止項目:', Array.from(unavailableItems));
    console.log('🛒 グローバル提供停止項目:', Array.from((global as any).globalUnavailableItems || new Set()));
    
    // グローバル状態も確認
    const globalUnavailable = (global as any).globalUnavailableItems || new Set();
    const isUnavailable = unavailableItems.has(item.id) || globalUnavailable.has(item.id);
    
    if (isUnavailable) {
      console.log('❌ 提供停止中のため注文不可:', item.name);
      Alert.alert('提供不可', `「${item.name}」は現在提供しておりません`);
      return;
    }

    console.log('✅ カートに追加:', item.name);
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => {
      return prevCart.reduce((acc, item) => {
        if (item.id === id) {
          if (item.quantity > 1) {
            acc.push({ ...item, quantity: item.quantity - 1 });
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as any[]);
    });
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const confirmOrder = () => {
    if (cart.length === 0) {
      Alert.alert('エラー', 'カートが空です');
      return;
    }
    
    Alert.alert(
      '注文確定',
      `テーブル ${tableNumber}\n\n注文内容:\n${cart.map(item => `・${item.name} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}`).join('\n')}\n\n合計金額: ¥${getTotalPrice().toLocaleString()}\n\nこの内容で注文を確定しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '注文確定',
          onPress: async () => {
            try {
              console.log('📝 注文確定処理開始...');
              
              if (database && isConnected) {
                console.log('💾 Supabaseに注文を保存中...');
                for (const item of cart) {
                  await database.createOrder({
                    table_id: tableId as string,
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                  });
                }
                
                await database.updateTable(tableId as string, {
                  status: 'occupied',
                  customer_count: 1,
                  order_start_time: new Date().toISOString(),
                  total_amount: getTotalPrice(),
                });
                console.log('✅ Supabase注文保存完了');
              } else {
                console.log('⚠️ データベース未接続 - ローカル処理のみ');
              }
              
              if ((global as any).updateTableOrder) {
                (global as any).updateTableOrder(tableId, cart, getTotalPrice());
              }
              
              if ((global as any).updateTableStatus) {
                (global as any).updateTableStatus(tableId, 'occupied', {
                  orderStartTime: new Date(),
                  customerCount: 1
                });
              }
              
              Alert.alert(
                '注文確定完了',
                `🎉 テーブル ${tableNumber}の注文が確定されました！\n\n📝 ${cart.length}品目の注文\n💰 合計金額: ¥${getTotalPrice().toLocaleString()}\n\n支払いはテーブル管理画面から行えます。`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setCart([]);
                      router.back();
                    },
                  },
                ]
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

  const groupedItems = categories.reduce((acc, category) => {
    acc[category] = menuItems.filter(item => item.category === category);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  // メニュー選択モードでない場合は通常のメニュー管理画面
  if (!tableId || !tableNumber) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>メニュー管理</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addMenuButton}
              onPress={() => setShowAddMenuModal(true)}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Coffee size={24} color="#FFFFFF" />
            {isConnected && <View style={styles.connectedDot} />}
          </View>
        </View>

        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {isConnected ? '🟢 データベース連携' : '🔴 ローカルデータ'} • メニュー: {menuItems.length}件 • 提供停止: {unavailableItems.size}件
          </Text>
        </View>

        <ScrollView style={styles.content}>
          {categories.map(category => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {groupedItems[category].map(item => (
                <View key={item.id} style={[
                  styles.menuItem,
                  unavailableItems.has(item.id) && styles.menuItemUnavailable
                ]}>
                  <Image source={{ uri: item.image }} style={styles.menuImage} />
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuName}>{item.name}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                    <Text style={styles.menuPrice}>¥{item.price}</Text>
                    {unavailableItems.has(item.id) && (
                      <Text style={styles.unavailableText}>提供停止中</Text>
                    )}
                  </View>
                  <View style={styles.menuActions}>
                    <TouchableOpacity
                      style={[
                        styles.availabilityButton,
                        unavailableItems.has(item.id) ? styles.unavailableButton : styles.availableButton
                      ]}
                      onPress={() => toggleAvailability(item.id)}
                    >
                      <Text style={[
                        styles.availabilityButtonText,
                        unavailableItems.has(item.id) ? styles.unavailableButtonText : styles.availableButtonText
                      ]}>
                        {unavailableItems.has(item.id) ? '提供停止' : '提供中'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editMenuButton}
                      onPress={() => {
                        setEditingItem(item);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit size={14} color="#FFFFFF" />
                      <Text style={styles.editMenuButtonText}>編集</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteMenuButton}
                      onPress={() => deleteMenuItem(item.id)}
                    >
                      <Trash2 size={14} color="#FFFFFF" />
                      <Text style={styles.deleteMenuButtonText}>削除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* メニュー追加モーダル */}
        <Modal
          visible={showAddMenuModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddMenuModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>新しいメニュー項目を追加</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowAddMenuModal(false)}
                >
                  <X size={20} color="#8B4513" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <TextInput
                  style={styles.input}
                  placeholder="商品名"
                  value={newMenuItem.name}
                  onChangeText={(text) => setNewMenuItem({...newMenuItem, name: text})}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="価格"
                  keyboardType="numeric"
                  value={newMenuItem.price}
                  onChangeText={(text) => setNewMenuItem({...newMenuItem, price: text})}
                />
                
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>カテゴリ:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryOption,
                          newMenuItem.category === category && styles.categoryOptionSelected
                        ]}
                        onPress={() => setNewMenuItem({...newMenuItem, category})}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          newMenuItem.category === category && styles.categoryOptionTextSelected
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <TextInput
                  style={styles.input}
                  placeholder="説明"
                  value={newMenuItem.description}
                  onChangeText={(text) => setNewMenuItem({...newMenuItem, description: text})}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="画像URL"
                  value={newMenuItem.image}
                  onChangeText={(text) => setNewMenuItem({...newMenuItem, image: text})}
                />
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddMenuModal(false)}
                >
                  <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={addMenuItem}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>追加</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* メニュー項目編集モーダル */}
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>メニュー項目を編集</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                >
                  <X size={20} color="#8B4513" />
                </TouchableOpacity>
              </View>
              
              {editingItem && (
                <ScrollView style={styles.modalBody}>
                  <TextInput
                    style={styles.input}
                    placeholder="商品名"
                    value={editingItem.name}
                    onChangeText={(text) => setEditingItem({...editingItem, name: text})}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="価格"
                    keyboardType="numeric"
                    value={editingItem.price.toString()}
                    onChangeText={(text) => setEditingItem({...editingItem, price: parseInt(text) || 0})}
                  />
                  <View style={styles.pickerContainer}>
                    <Text style={styles.pickerLabel}>カテゴリ:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryOption,
                            editingItem.category === category && styles.categoryOptionSelected
                          ]}
                          onPress={() => setEditingItem({...editingItem, category})}
                        >
                          <Text style={[
                            styles.categoryOptionText,
                            editingItem.category === category && styles.categoryOptionTextSelected
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="説明"
                    value={editingItem.description}
                    onChangeText={(text) => setEditingItem({...editingItem, description: text})}
                  />
                  <View style={styles.imageSection}>
                    <Text style={styles.inputLabel}>商品画像</Text>
                    <View style={styles.imagePreviewContainer}>
                      <Image 
                        source={{ uri: editingItem.image }} 
                        style={styles.imagePreview}
                        onError={() => {
                          console.log('画像読み込みエラー:', editingItem.image);
                        }}
                      />
                      <View style={styles.imageButtons}>
                        <TouchableOpacity
                          style={styles.imageButton}
                          onPress={() => showImageOptions(true)}
                        >
                          <Camera size={16} color="#FFFFFF" />
                          <Text style={styles.imageButtonText}>画像変更</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TextInput
                      style={[styles.input, styles.urlInput]}
                      placeholder="または画像URLを入力"
                      value={editingItem.image}
                      onChangeText={(text) => setEditingItem({...editingItem, image: text})}
                    />
                  </View>
                </ScrollView>
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={updateMenuItem}
                >
                  <Save size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>更新</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // メニュー選択モード（注文画面）
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            テーブル {tableNumber}
          </Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'order' ? '注文' : '追加注文'}
          </Text>
        </View>
        <View style={styles.connectionStatus}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={confirmOrder}
          >
            <ShoppingCart size={20} color="#FFFFFF" />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          {isConnected && <View style={styles.connectedDot} />}
        </View>
      </View>

      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          メニュー: {menuItems.length}件 | 提供停止: {unavailableItems.size}件 | カート: {cart.length}件
        </Text>
      </View>

      <ScrollView style={styles.menuContent}>
        {categories.map(category => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {groupedItems[category].map(item => {
              const globalUnavailable = (global as any).globalUnavailableItems || new Set();
              const isUnavailable = unavailableItems.has(item.id) || globalUnavailable.has(item.id);
              
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    isUnavailable && styles.menuItemUnavailable
                  ]}
                  onPress={() => addToCart(item)}
                  disabled={isUnavailable}
                >
                  <Image source={{ uri: item.image }} style={styles.menuImage} />
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuName}>{item.name}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                    <Text style={styles.menuPrice}>¥{item.price}</Text>
                    {isUnavailable && (
                      <Text style={styles.unavailableText}>提供停止中</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      isUnavailable && styles.addButtonDisabled
                    ]}
                    onPress={() => addToCart(item)}
                    disabled={isUnavailable}
                  >
                    <Text style={[
                      styles.addButtonText,
                      isUnavailable && styles.addButtonTextDisabled
                    ]}>
                      {isUnavailable ? '×' : '+'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* カート表示エリア */}
      {cart.length > 0 && (
        <View style={styles.cartPreview}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>注文内容 ({cart.length}品目)</Text>
            <Text style={styles.cartTotal}>¥{getTotalPrice().toLocaleString()}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cartItems}>
            {cart.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <View style={styles.cartItemControls}>
                  <TouchableOpacity
                    style={styles.cartItemButton}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Minus size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.cartItemQuantity}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.cartItemButton}
                    onPress={() => addToCart(item)}
                  >
                    <Plus size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={confirmOrder}
          >
            <Text style={styles.proceedButtonText}>注文確定</Text>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  connectionStatus: {
    alignItems: 'center',
    position: 'relative',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  addMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectedDot: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
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
  debugInfo: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  debugText: {
    fontSize: 12,
    color: '#8B4513',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  menuContent: {
    flex: 1,
    padding: 15,
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemUnavailable: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  menuImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  menuInfo: {
    flex: 1,
    marginLeft: 15,
  },
  menuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  menuDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 4,
  },
  unavailableText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'bold',
    marginTop: 2,
  },
  menuActions: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
    minWidth: 80,
  },
  availabilityButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
  },
  availableButton: {
    backgroundColor: '#10B981',
  },
  unavailableButton: {
    backgroundColor: '#EF4444',
  },
  availabilityButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  availableButtonText: {
    color: '#FFFFFF',
  },
  unavailableButtonText: {
    color: '#FFFFFF',
  },
  editMenuButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
  },
  editMenuButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  deleteMenuButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
  },
  deleteMenuButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  addButton: {
    backgroundColor: '#8B4513',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButtonTextDisabled: {
    color: '#666666',
  },
  cartPreview: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  cartItems: {
    maxHeight: 120,
    marginBottom: 15,
  },
  cartItem: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    minWidth: 150,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemButton: {
    backgroundColor: '#8B4513',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantity: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  proceedButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryOption: {
    backgroundColor: '#F5E6D3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  categoryOptionText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  imageSection: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  imagePreviewContainer: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginBottom: 10,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  imageButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  urlInput: {
    fontSize: 12,
    color: '#666666',
  },
  trashContent: {
    padding: 20,
    maxHeight: 500,
  },
  emptyTrash: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTrashText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 15,
  },
  trashItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  trashItemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    opacity: 0.7,
  },
  trashItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trashItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
  },
  trashItemCategory: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  trashItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 2,
  },
  trashItemDate: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },
  trashItemActions: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
    minWidth: 80,
  },
  restoreButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
  },
  restoreButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  permanentDeleteButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 60,
  },
  permanentDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});