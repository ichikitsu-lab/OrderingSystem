import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

const SOUND_EFFECTS_KEY = 'sound_effects_enabled';

let soundEffectsEnabled = true;
let audioContext: AudioContext | null = null;
let isAudioContextReady = false;
let isAudioConfigured = false;

// 音声ファイルのプリロード用
const soundFiles = {
  orderConfirm1: require('../assets/sounds/order_confirm_1.wav'),
  orderConfirm2: require('../assets/sounds/order_confirm_2.wav'),
  paymentComplete1: require('../assets/sounds/payment_complete_1.wav'),
  paymentComplete2: require('../assets/sounds/payment_complete_2.wav'),
  paymentComplete3: require('../assets/sounds/payment_complete_3.wav'),
};

// プリロードされたサウンドオブジェクトのキャッシュ
let soundCache: { [key: string]: Audio.Sound } = {};

export const initializeSounds = async () => {
  try {
    const enabled = await getSoundEffectsEnabled();
    soundEffectsEnabled = enabled;

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // オーディオモードを設定（iOSのサイレントモードでも音を再生）
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      isAudioConfigured = true;
      console.log('🔊 ネイティブ音響効果初期化完了');

      // 音声ファイルをプリロード
      try {
        for (const [key, file] of Object.entries(soundFiles)) {
          const { sound } = await Audio.Sound.createAsync(file);
          soundCache[key] = sound;
        }
        console.log('🔊 音声ファイルプリロード完了');
      } catch (error) {
        console.error('音声ファイルプリロードエラー:', error);
      }
    } else if (Platform.OS === 'web' && typeof AudioContext !== 'undefined') {
      audioContext = new AudioContext();
      console.log('🔊 Web Audio API初期化完了 (状態:', audioContext.state, ')');

      if (audioContext.state === 'suspended') {
        console.log('⏸️ AudioContext suspended - ユーザーインタラクション待機中');
      } else {
        isAudioContextReady = true;
        console.log('✅ AudioContext ready');
      }
    }

    console.log('🔊 音響効果初期化完了');
  } catch (error) {
    console.error('音響効果初期化エラー:', error);
  }
};

export const resumeAudioContext = async () => {
  if (Platform.OS === 'web' && audioContext && audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      isAudioContextReady = true;
      console.log('✅ AudioContext resumed - 音響効果が有効になりました');
    } catch (error) {
      console.error('AudioContext resume エラー:', error);
    }
  }
};

// プリロードされた音声を再生
const playCachedSound = async (soundKey: string): Promise<void> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  try {
    const sound = soundCache[soundKey];
    if (sound) {
      // 再生位置をリセット
      await sound.setPositionAsync(0);
      // 再生
      await sound.playAsync();
    } else {
      console.warn(`⚠️ 音声ファイルが見つかりません: ${soundKey}`);
    }
  } catch (error) {
    console.error('音声再生エラー:', error);
  }
};

const playBeep = async (frequency: number, duration: number, delay: number = 0): Promise<void> => {
  if (!soundEffectsEnabled) {
    return;
  }

  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      try {
        if (Platform.OS === 'web' && audioContext) {
          if (audioContext.state !== 'running') {
            console.warn('⚠️ AudioContextが利用できません (状態:', audioContext.state, ')');
            resolve();
            return;
          }

          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';

          const startTime = audioContext.currentTime;
          const endTime = startTime + duration / 1000;

          gainNode.gain.setValueAtTime(0.3, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

          oscillator.start(startTime);
          oscillator.stop(endTime);

          oscillator.onended = () => {
            resolve();
          };

          setTimeout(() => {
            resolve();
          }, duration + 100);
        } else {
          resolve();
        }
      } catch (error) {
        console.error('ビープ音再生エラー:', error);
        resolve();
      }
    }, delay);
  });
};

export const playOrderConfirmSound = async () => {
  if (!soundEffectsEnabled) {
    console.log('🔇 音響効果無効 - 注文確定音スキップ');
    return;
  }

  try {
    await resumeAudioContext();

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // 1つ目の音
      await playCachedSound('orderConfirm1');
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 250));
      // 2つ目の音
      await playCachedSound('orderConfirm2');
      console.log('🔊 注文確定音再生 (ネイティブ)');
    } else if (Platform.OS === 'web' && audioContext && audioContext.state === 'running') {
      await playBeep(800, 200, 0);
      await playBeep(1000, 200, 250);
      console.log('🔊 注文確定音再生 (Web)');
    }
  } catch (error) {
    console.error('注文確定音再生エラー:', error);
  }
};

export const playPaymentCompleteSound = async () => {
  if (!soundEffectsEnabled) {
    console.log('🔇 音響効果無効 - 支払い完了音スキップ');
    return;
  }

  try {
    await resumeAudioContext();

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // 1つ目の音
      await playCachedSound('paymentComplete1');
      await new Promise(resolve => setTimeout(resolve, 200));
      // 2つ目の音
      await playCachedSound('paymentComplete2');
      await new Promise(resolve => setTimeout(resolve, 200));
      // 3つ目の音
      await playCachedSound('paymentComplete3');
      console.log('🔊 支払い完了音再生 (ネイティブ)');
    } else if (Platform.OS === 'web' && audioContext && audioContext.state === 'running') {
      await playBeep(600, 150, 0);
      await playBeep(800, 150, 200);
      await playBeep(1000, 300, 400);
      console.log('🔊 支払い完了音再生 (Web)');
    }
  } catch (error) {
    console.error('支払い完了音再生エラー:', error);
  }
};

export const setSoundEffectsEnabled = async (enabled: boolean) => {
  soundEffectsEnabled = enabled;
  await AsyncStorage.setItem(SOUND_EFFECTS_KEY, JSON.stringify(enabled));
  console.log(`🔊 音響効果設定更新: ${enabled ? '有効' : '無効'}`);
};

export const getSoundEffectsEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(SOUND_EFFECTS_KEY);
    return value ? JSON.parse(value) : true;
  } catch (error) {
    console.error('音響効果設定読み込みエラー:', error);
    return true;
  }
};

export const cleanupSounds = async () => {
  try {
    // ネイティブのサウンドキャッシュをクリーンアップ
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      for (const [key, sound] of Object.entries(soundCache)) {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.error(`サウンド ${key} のアンロードエラー:`, error);
        }
      }
      soundCache = {};
    }
    
    if (Platform.OS === 'web' && audioContext) {
      await audioContext.close();
      audioContext = null;
    }
    console.log('🔊 音響効果クリーンアップ完了');
  } catch (error) {
    console.error('音響効果クリーンアップエラー:', error);
  }
};
