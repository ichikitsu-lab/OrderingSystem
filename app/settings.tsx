import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { User, Bell, Shield, CircleHelp as HelpCircle, Store, Printer, Wifi, CreditCard, X, ArrowLeft } from 'lucide-react-native';
// Supabase関連のインポートはエンジニア向け機能として非表示
// import { initializeSupabase, clearSupabaseConfig, loadSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase';
// import { useDatabase } from '@/hooks/useDatabase';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSoundEffectsEnabled, getSoundEffectsEnabled, resumeAudioContext, playOrderConfirmSound } from '@/lib/soundEffects';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
}

// モックメニューデータを削除 - Supabaseから実際のメニューを読み込み
const initialMenuItems: MenuItem[] = [];

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [receiptPrinting, setReceiptPrinting] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  // Supabase関連のステートはエンジニア向け機能として非表示
  // const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  // const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  // const [supabaseUrl, setSupabaseUrl] = useState('');
  // const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  // const [isMigrating, setIsMigrating] = useState(false);
  
  // 店舗情報設定
  const [storeName, setStoreName] = useState('');
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false);
  const [tempStoreName, setTempStoreName] = useState('');
  
  // 支払い設定
  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    card: false,
    paypay: false,
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  


  // データベースフックはエンジニア向け機能として非表示
  // const { database } = useDatabase();
  
  // 初期化処理
  React.useEffect(() => {
    // checkSupabaseConfig(); // エンジニア向け機能として非表示
    loadStoreName();
    loadSoundEffectsSetting();
  }, []);

  const loadSoundEffectsSetting = async () => {
    try {
      const enabled = await getSoundEffectsEnabled();
      setSoundEffects(enabled);
    } catch (error) {
      console.error('音響効果設定読み込みエラー:', error);
    }
  };

  const loadStoreName = async () => {
    try {
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
      if ((global as any).setStoreName) {
        (global as any).setStoreName(defaultName);
      }
    }
  };

  // Supabase関連の関数はエンジニア向け機能として非表示
  /*
  const checkSupabaseConfig = async () => {
    const configured = await isSupabaseConfigured();
    setSupabaseConfigured(configured);
    if (configured) {
      await loadSupabaseConfig();
    }
  };

  const handleSupabaseSetup = async () => {
    // ... エンジニア向け機能
  };

  const handleSupabaseReset = () => {
    // ... エンジニア向け機能
  };
  */

  const handleStoreInfoSave = async () => {
    if (!tempStoreName.trim()) {
      Alert.alert('エラー', '店舗名を入力してください');
      return;
    }
    
    try {
      const newStoreName = tempStoreName.trim();
      
      // AsyncStorageに保存
      await AsyncStorage.setItem('store_name', newStoreName);
      
      // ローカル状態を更新
      setStoreName(newStoreName);
      
      // グローバル状態も更新
      if ((global as any).setStoreName) {
        (global as any).setStoreName(newStoreName);
      }
      
      setShowStoreInfoModal(false);
      setTempStoreName('');
      Alert.alert('完了', '店舗情報が更新されました');
    } catch (error) {
      console.error('店舗名保存エラー:', error);
      Alert.alert('エラー', '店舗名の保存に失敗しました');
    }
  };

  const handlePaymentMethodToggle = (method: 'cash' | 'card' | 'paypay') => {
    setPaymentMethods(prev => {
      const newMethods = { ...prev, [method]: !prev[method] };
      
      // 少なくとも1つの支払い方法は有効にする
      const hasAnyEnabled = Object.values(newMethods).some(enabled => enabled);
      if (!hasAnyEnabled) {
        Alert.alert('エラー', '少なくとも1つの支払い方法を有効にしてください');
        return prev;
      }
      
      return newMethods;
    });
  };

  const getPaymentMethodsText = () => {
    const enabled = [];
    if (paymentMethods.cash) enabled.push('現金');
    if (paymentMethods.card) enabled.push('カード');
    if (paymentMethods.paypay) enabled.push('PayPay');
    
    return enabled.length > 0 ? enabled.join('、') : '設定なし';
  };
  const showComingSoon = () => {
    Alert.alert('近日公開', 'この機能は近日公開予定です');
  };




  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showSwitch = false, 
    switchValue = false, 
    onSwitchChange 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showSwitch && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#E5E5E5', true: '#8B4513' }}
          thumbColor={switchValue ? '#FFFFFF' : '#FFFFFF'}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* データベース設定セクションを非表示にしました（エンジニア向け機能のため） */}



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>店舗設定</Text>
          <SettingItem
            icon={<Store size={24} color="#8B4513" />}
            title="店舗情報"
            subtitle={`店舗名: ${storeName || '未設定 - 設定が必要です'}`}
            onPress={() => {
              setTempStoreName(storeName);
              setShowStoreInfoModal(true);
            }}
          />
          <SettingItem
            icon={<CreditCard size={24} color="#8B4513" />}
            title="支払い設定"
            subtitle={`利用可能: ${getPaymentMethodsText()}`}
            onPress={() => setShowPaymentModal(true)}
          />
          <SettingItem
            icon={<Printer size={24} color="#8B4513" />}
            title="レシート印刷"
            subtitle="注文完了時に自動印刷"
            showSwitch={true}
            switchValue={receiptPrinting}
            onSwitchChange={setReceiptPrinting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ設定</Text>
          <SettingItem
            icon={<Bell size={24} color="#8B4513" />}
            title="通知"
            subtitle="新しい注文の通知を受信"
            showSwitch={true}
            switchValue={notifications}
            onSwitchChange={setNotifications}
          />
          <SettingItem
            icon={<Wifi size={24} color="#8B4513" />}
            title="オフラインモード"
            subtitle="インターネット接続なしでも動作"
            onPress={showComingSoon}
          />
          <SettingItem
            icon={<User size={24} color="#8B4513" />}
            title="音響効果"
            subtitle="ボタンタップ音とアラート音"
            showSwitch={true}
            switchValue={soundEffects}
            onSwitchChange={async (value) => {
              setSoundEffects(value);
              await setSoundEffectsEnabled(value);
              
              // 有効にした場合はテスト音を再生
              if (value) {
                await resumeAudioContext();
                await playOrderConfirmSound();
                Alert.alert('音響効果', '🔊 音響効果が有効になりました！\n\nテスト音が再生されました。');
              } else {
                Alert.alert('音響効果', '🔇 音響効果が無効になりました。');
              }
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <SettingItem
            icon={<User size={24} color="#8B4513" />}
            title="プロフィール"
            subtitle="個人情報とアカウント設定"
            onPress={showComingSoon}
          />
          <SettingItem
            icon={<Shield size={24} color="#8B4513" />}
            title="セキュリティ"
            subtitle="パスワード変更、二段階認証"
            onPress={showComingSoon}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サポート</Text>
          <SettingItem
            icon={<HelpCircle size={24} color="#8B4513" />}
            title="ヘルプ・サポート"
            subtitle="よくある質問、お問い合わせ"
            onPress={showComingSoon}
          />
        </View>



        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>バージョン 1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2024 Cafe POS System</Text>
        </View>
      </ScrollView>

      {/* 店舗情報設定モーダル */}
      <Modal
        visible={showStoreInfoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStoreInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>店舗情報設定</Text>
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setShowStoreInfoModal(false)}
              >
                <X size={20} color="#8B4513" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.storeInfoForm}>
              <Text style={styles.inputLabel}>店舗名</Text>
              <TextInput
                style={styles.input}
                placeholder="店舗名を入力してください"
                value={tempStoreName}
                onChangeText={setTempStoreName}
                autoFocus={true}
              />
              
              <View style={styles.helpText}>
                <Text style={styles.helpTextContent}>
                  この名前はアプリのヘッダーやレシートに表示されます
                </Text>
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowStoreInfoModal(false);
                    setTempStoreName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleStoreInfoSave}
                >
                  <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 支払い設定モーダル */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>支払い方法設定</Text>
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <X size={20} color="#8B4513" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentMethodsForm}>
              <Text style={styles.formDescription}>
                利用可能な支払い方法を選択してください
              </Text>
              
              <View style={styles.paymentMethodItem}>
                <Text style={styles.paymentMethodLabel}>現金</Text>
                <Switch
                  value={paymentMethods.cash}
                  onValueChange={() => handlePaymentMethodToggle('cash')}
                  trackColor={{ false: '#E5E5E5', true: '#8B4513' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <View style={styles.paymentMethodItem}>
                <Text style={styles.paymentMethodLabel}>クレジットカード</Text>
                <Switch
                  value={paymentMethods.card}
                  onValueChange={() => handlePaymentMethodToggle('card')}
                  trackColor={{ false: '#E5E5E5', true: '#8B4513' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <View style={styles.paymentMethodItem}>
                <Text style={styles.paymentMethodLabel}>PayPay</Text>
                <Switch
                  value={paymentMethods.paypay}
                  onValueChange={() => handlePaymentMethodToggle('paypay')}
                  trackColor={{ false: '#E5E5E5', true: '#8B4513' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <View style={styles.helpText}>
                <Text style={styles.helpTextContent}>
                  少なくとも1つの支払い方法を有効にしてください
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.saveButtonText}>完了</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* Supabase設定モーダルを非表示にしました（エンジニア向け機能のため） */}
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
    fontSize: 24,
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
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
    marginLeft: 5,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    backgroundColor: '#F5E6D3',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },

  versionInfo: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  versionSubtext: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
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
  modalHeaderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalHeaderButton: {
    backgroundColor: '#F5E6D3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 0.45,
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
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
  storeInfoForm: {
    paddingVertical: 10,
  },
  paymentMethodsForm: {
    paddingVertical: 10,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  paymentMethodLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  supabaseForm: {
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
  keyInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 20,
  },
  helpTextContent: {
    fontSize: 12,
    color: '#0369A1',
    textAlign: 'center',
  },

  migrationStatus: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  migrationText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },
});