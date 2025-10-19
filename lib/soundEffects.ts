import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SOUND_EFFECTS_KEY = 'sound_effects_enabled';

let soundEffectsEnabled = true;
let audioContext: AudioContext | null = null;
let isAudioContextReady = false;

export const initializeSounds = async () => {
  try {
    const enabled = await getSoundEffectsEnabled();
    soundEffectsEnabled = enabled;

    if (Platform.OS === 'web' && typeof AudioContext !== 'undefined') {
      audioContext = new AudioContext();
      console.log('🔊 Web Audio API初期化完了 (状態:', audioContext.state, ')');
      
      // AudioContextがsuspended状態の場合、ユーザーインタラクション後にresumeする
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

// AudioContextをユーザーインタラクション後に有効化
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

const playBeep = async (frequency: number, duration: number, delay: number = 0): Promise<void> => {
  if (!soundEffectsEnabled) {
    return;
  }

  return new Promise<void>((resolve) => {
    try {
      if (Platform.OS === 'web' && audioContext) {
        // AudioContextが利用可能でない場合はスキップ
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

        const startTime = audioContext.currentTime + delay / 1000;
        const endTime = startTime + duration / 1000;

        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

        oscillator.start(startTime);
        oscillator.stop(endTime);
        
        // 音の終了を待つ
        oscillator.onended = () => {
          resolve();
        };
        
        // タイムアウト保護
        setTimeout(() => {
          resolve();
        }, delay + duration + 100);
      } else {
        resolve();
      }
    } catch (error) {
      console.error('ビープ音再生エラー:', error);
      resolve();
    }
  });
};

export const playOrderConfirmSound = async () => {
  if (!soundEffectsEnabled) {
    console.log('🔇 音響効果無効 - 注文確定音スキップ');
    return;
  }

  try {
    // AudioContextを確実に有効化
    await resumeAudioContext();
    
    if (Platform.OS === 'web' && audioContext && audioContext.state === 'running') {
      // Web Audio APIで全ての音を一度にスケジュール
      await playBeep(800, 200, 0);
      await playBeep(1000, 200, 250);
      console.log('🔊 注文確定音再生');
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
    // AudioContextを確実に有効化
    await resumeAudioContext();
    
    if (Platform.OS === 'web' && audioContext && audioContext.state === 'running') {
      // Web Audio APIで全ての音を一度にスケジュール
      await playBeep(600, 150, 0);
      await playBeep(800, 150, 200);
      await playBeep(1000, 300, 400);
      console.log('🔊 支払い完了音再生');
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
    if (audioContext) {
      await audioContext.close();
      audioContext = null;
    }
    console.log('🔊 音響効果クリーンアップ完了');
  } catch (error) {
    console.error('音響効果クリーンアップエラー:', error);
  }
};
