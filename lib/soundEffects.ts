import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

const SOUND_EFFECTS_KEY = 'sound_effects_enabled';

let soundEffectsEnabled = true;
let audioContext: AudioContext | null = null;
let isAudioContextReady = false;
let isAudioConfigured = false;

export const initializeSounds = async () => {
  try {
    const enabled = await getSoundEffectsEnabled();
    soundEffectsEnabled = enabled;

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      isAudioConfigured = true;
      console.log('🔊 ネイティブ音響効果初期化完了');
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

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';

  for (let i = 0; i < binary.length; i += 3) {
    const byte1 = binary.charCodeAt(i);
    const byte2 = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    const byte3 = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const enc4 = byte3 & 63;

    result += base64Chars[enc1] + base64Chars[enc2];
    result += i + 1 < binary.length ? base64Chars[enc3] : '=';
    result += i + 2 < binary.length ? base64Chars[enc4] : '=';
  }

  return result;
};

const generateBeepWav = (frequency: number, duration: number): ArrayBuffer => {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * (duration / 1000));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3;
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, value * 0x7FFF, true);
  }

  return buffer;
};

const playBeepNative = async (frequency: number, duration: number): Promise<void> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  try {
    const soundObject = new Audio.Sound();

    const audioBuffer = generateBeepWav(frequency, duration);
    const base64Audio = arrayBufferToBase64(audioBuffer);
    const uri = `data:audio/wav;base64,${base64Audio}`;

    await soundObject.loadAsync({ uri });
    await soundObject.playAsync();

    setTimeout(async () => {
      await soundObject.unloadAsync();
    }, duration + 100);
  } catch (error) {
    console.error('ネイティブビープ音再生エラー:', error);
  }
};

const playBeep = async (frequency: number, duration: number, delay: number = 0): Promise<void> => {
  if (!soundEffectsEnabled) {
    return;
  }

  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      try {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          await playBeepNative(frequency, duration);
          resolve();
        } else if (Platform.OS === 'web' && audioContext) {
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
      await playBeep(800, 200, 0);
      await playBeep(1000, 200, 250);
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
      await playBeep(600, 150, 0);
      await playBeep(800, 150, 200);
      await playBeep(1000, 300, 400);
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
    if (Platform.OS === 'web' && audioContext) {
      await audioContext.close();
      audioContext = null;
    }
    console.log('🔊 音響効果クリーンアップ完了');
  } catch (error) {
    console.error('音響効果クリーンアップエラー:', error);
  }
};
