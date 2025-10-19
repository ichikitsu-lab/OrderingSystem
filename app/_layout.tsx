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

    // ドキュメントクリック時にAudioContextを有効化（Web専用）
    const handleFirstInteraction = () => {
      resumeAudioContext();
      // 一度実行したら削除
      if (typeof document !== 'undefined') {
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleFirstInteraction);
      document.addEventListener('touchstart', handleFirstInteraction);
    }

    return () => {
      cleanupSounds();
      if (typeof document !== 'undefined') {
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
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
