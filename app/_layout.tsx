import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableWithoutFeedback, View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { initializeSounds, cleanupSounds, resumeAudioContext } from '@/lib/soundEffects';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    initializeSounds();

    // ドキュメントクリック/タッチ時にAudioContextを有効化（Web/iOS Safari対応）
    const handleFirstInteraction = async () => {
      await resumeAudioContext();
      // 一度実行したら削除
      if (typeof document !== 'undefined') {
        document.removeEventListener('click', handleFirstInteraction, true);
        document.removeEventListener('touchstart', handleFirstInteraction, true);
        document.removeEventListener('touchend', handleFirstInteraction, true);
      }
    };

    if (typeof document !== 'undefined') {
      // キャプチャフェーズで確実にイベントを捕捉
      document.addEventListener('click', handleFirstInteraction, true);
      document.addEventListener('touchstart', handleFirstInteraction, true);
      document.addEventListener('touchend', handleFirstInteraction, true);
    }

    return () => {
      cleanupSounds();
      if (typeof document !== 'undefined') {
        document.removeEventListener('click', handleFirstInteraction, true);
        document.removeEventListener('touchstart', handleFirstInteraction, true);
        document.removeEventListener('touchend', handleFirstInteraction, true);
      }
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
