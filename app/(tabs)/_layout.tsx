import { Tabs } from 'expo-router';
import { Grid3x3 } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B4513', 
        tabBarInactiveTintColor: '#A0A0A0', 
        tabBarStyle: {
          display: 'none', // タブバーを非表示にする
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'テーブル',
          tabBarIcon: ({ size, color }) => (
            <Grid3x3 size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}