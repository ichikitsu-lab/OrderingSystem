# iOS音響効果の修正実装

## 問題

iPhoneのExpo Goアプリで音響効果が再生されない問題がありました。主な原因：

1. `expo-av`パッケージがインストールされていない（`node_modules`がない）
2. データURIからの音声再生はiOSで制限がある

## 実装した解決策

### 1. 依存関係のインストール

```bash
npm install --legacy-peer-deps
```

### 2. 音声ファイルの生成

Pythonスクリプトを使用して、実際のWAVファイルを生成：

- `assets/sounds/order_confirm_1.wav` - 800Hz, 200ms
- `assets/sounds/order_confirm_2.wav` - 1000Hz, 200ms
- `assets/sounds/payment_complete_1.wav` - 600Hz, 150ms
- `assets/sounds/payment_complete_2.wav` - 800Hz, 150ms
- `assets/sounds/payment_complete_3.wav` - 1000Hz, 300ms

### 3. `lib/soundEffects.ts`の修正

主な変更点：

#### 音声ファイルのプリロード

```typescript
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
```

#### iOSの音声設定

```typescript
// iOSのサイレントモードでも音を再生する設定
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,  // 重要！
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});
```

#### プリロード処理

```typescript
// 音声ファイルをプリロード
for (const [key, file] of Object.entries(soundFiles)) {
  const { sound } = await Audio.Sound.createAsync(file);
  soundCache[key] = sound;
}
```

#### 音声再生

```typescript
const playCachedSound = async (soundKey: string): Promise<void> => {
  const sound = soundCache[soundKey];
  if (sound) {
    await sound.setPositionAsync(0);  // 再生位置をリセット
    await sound.playAsync();           // 再生
  }
};
```

## テスト方法

1. Expo Goでアプリを起動：
   ```bash
   cd /home/user/webapp && npm run dev:tunnel
   ```

2. iPhoneでQRコードをスキャン

3. 設定画面で「音響効果」スイッチを確認（デフォルトでオン）

4. 以下の操作で音が鳴ることを確認：
   - 注文確定時: 2つのビープ音（800Hz → 1000Hz）
   - 支払い完了時: 3つのビープ音（600Hz → 800Hz → 1000Hz）

## 重要な注意事項

### iOSのサイレントモード

- `playsInSilentModeIOS: true`を設定することで、サイレントモードでも音が再生されます
- ユーザーがサイレントモードを有効にしている場合でも、アプリ内の音響効果は動作します

### 音声ファイルのフォーマット

- WAV形式を使用（互換性が高い）
- サンプルレート: 44100 Hz
- ビット深度: 16 bit
- チャンネル: モノラル

### プリロードの利点

1. 初回再生時の遅延がない
2. アプリ起動時に一度だけロード
3. メモリ効率が良い（小さいファイルサイズ）

### クリーンアップ

アプリ終了時やコンポーネントのアンマウント時に、サウンドキャッシュをクリーンアップ：

```typescript
for (const [key, sound] of Object.entries(soundCache)) {
  await sound.unloadAsync();
}
soundCache = {};
```

## トラブルシューティング

### 音が聞こえない場合

1. **音量を確認**：iPhoneの音量ボタンで音量を上げる
2. **サイレントモードを確認**：設定で`playsInSilentModeIOS: true`が有効か確認
3. **音響効果設定を確認**：アプリの設定画面でスイッチがオンになっているか確認
4. **コンソールログを確認**：
   - `🔊 ネイティブ音響効果初期化完了`
   - `🔊 音声ファイルプリロード完了`
   - `🔊 注文確定音再生 (ネイティブ)`

### Expoでの動作確認

```bash
# ログを確認
cd /home/user/webapp && npm run dev:tunnel
# アプリ内でログを確認
```

## 今後の改善案

1. **音声ファイルのバリエーション**：
   - エラー音
   - 警告音
   - 成功音

2. **音量調整機能**：
   - ユーザーが音量を調整できるスライダーを追加

3. **カスタム音声**：
   - ユーザーがカスタム音声ファイルをアップロードできる機能

4. **振動フィードバック**：
   - 音と合わせて振動フィードバックを追加（`expo-haptics`を使用）
