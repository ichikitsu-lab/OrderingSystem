import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ArrowLeft, Calendar, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function CalendarScreen() {
  const router = useRouter();

  React.useEffect(() => {
    // 開発中の警告を表示
    Alert.alert(
      '開発中の機能',
      '予約システムは現在開発中です。\n\n将来のアップデートで以下の機能が追加予定です：\n\n• 月間カレンダー表示\n• 予約の追加・編集・削除\n• お客様情報管理\n• 事前メニューリクエスト\n• 予約時間管理',
      [
        {
          text: '戻る',
          onPress: () => router.back(),
        },
      ]
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>予約カレンダー</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.developmentNotice}>
          <AlertTriangle size={48} color="#F59E0B" />
          <Text style={styles.developmentTitle}>開発中</Text>
          <Text style={styles.developmentDescription}>
            予約システムは現在開発中です。{'\n'}
            今後のアップデートで利用可能になります。
          </Text>
          
          <View style={styles.plannedFeatures}>
            <Text style={styles.featuresTitle}>予定機能:</Text>
            <Text style={styles.featureItem}>• 月間カレンダー表示</Text>
            <Text style={styles.featureItem}>• 予約の追加・編集・削除</Text>
            <Text style={styles.featureItem}>• お客様情報管理</Text>
            <Text style={styles.featureItem}>• 事前メニューリクエスト</Text>
            <Text style={styles.featureItem}>• 予約時間管理</Text>
          </View>

          <TouchableOpacity
            style={styles.backToMainButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToMainButtonText}>メイン画面に戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  developmentNotice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 400,
    width: '100%',
  },
  developmentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginTop: 15,
    marginBottom: 10,
  },
  developmentDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  plannedFeatures: {
    alignSelf: 'stretch',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
    lineHeight: 20,
  },
  backToMainButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToMainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});