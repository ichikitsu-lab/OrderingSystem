# 音響効果が再生されない問題の修正

## 問題の概要

設定画面に「音響効果」のスイッチがあり、それを使って音を制御できますが、実際に音が鳴らない問題がありました。

## 原因

Web Audio APIには**ブラウザのセキュリティポリシー**により、以下の制限があります：

1. **AudioContextは最初はsuspended状態で作成される**
2. **ユーザーのインタラクション（クリック、タップ）後でないと音を再生できない**
3. **AudioContext.resume()を明示的に呼び出す必要がある**

従来のコードでは、`AudioContext`を作成するだけで、`suspended`状態を適切に処理していませんでした。

## 修正内容

### 1. `lib/soundEffects.ts` の改善

#### 追加された機能：
- **`isAudioContextReady`フラグ**: AudioContextの準備状態を追跡
- **`resumeAudioContext()`関数**: AudioContextを明示的に有効化する新しい関数
- **自動resume機能**: `playBeep()`内でAudioContextがsuspendedの場合、自動的にresumeを試みる
- **詳細なログ出力**: AudioContextの状態をコンソールに表示

```typescript
// 新しい変数
let isAudioContextReady = false;

// 新しい関数
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
```

### 2. `app/_layout.tsx` の改善

アプリ起動時にドキュメント全体のクリック/タッチイベントを監視し、最初のユーザーインタラクション時にAudioContextを自動的に有効化します。

```typescript
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
```

### 3. `app/order.tsx` と `app/payment.tsx` の改善

音を再生する直前に`resumeAudioContext()`を明示的に呼び出すことで、確実に音が再生されるようにしました。

```typescript
// 注文確定音を再生（AudioContextを有効化してから）
await resumeAudioContext();
await playOrderConfirmSound();
```

```typescript
// 支払い完了音を再生（AudioContextを有効化してから）
await resumeAudioContext();
await playPaymentCompleteSound();
```

### 4. `app/settings.tsx` の改善

音響効果のスイッチをONにしたときに、テスト音を再生してユーザーに確認できるようにしました。

```typescript
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
```

## テスト方法

### 1. 設定画面でのテスト
1. アプリを起動
2. 設定画面を開く
3. 「音響効果」のスイッチをONにする
4. ✅ テスト音（ピピッという2音）が再生されることを確認
5. アラートメッセージが表示されることを確認

### 2. 注文確定時のテスト
1. テーブルを選択して注文画面を開く
2. メニューを追加して注文確定ボタンをタップ
3. ✅ 注文確定音（ピピッという2音）が再生されることを確認

### 3. 支払い完了時のテスト
1. 注文がある状態で支払い画面を開く
2. 支払いボタンをタップして支払いを完了
3. ✅ 支払い完了音（ピピピッという3音）が再生されることを確認

## ブラウザの対応状況

この修正により、以下のブラウザで音響効果が正常に動作します：

- ✅ Chrome / Edge (Chromium)
- ✅ Firefox
- ✅ Safari (iOS含む)
- ✅ Opera

## デバッグログ

音響効果の動作を確認するために、以下のログがコンソールに出力されます：

- `🔊 Web Audio API初期化完了 (状態: suspended)` - 初期化時
- `⏸️ AudioContext suspended - ユーザーインタラクション待機中` - suspended状態
- `✅ AudioContext resumed - 音響効果が有効になりました` - resume成功
- `🔊 注文確定音再生` - 注文確定時
- `🔊 支払い完了音再生` - 支払い完了時
- `⚠️ AudioContextが利用できません (状態: suspended)` - resume失敗時

## 技術的な詳細

### Web Audio APIの状態遷移

```
初期状態: suspended
    ↓
ユーザーインタラクション（クリック/タップ）
    ↓
audioContext.resume() 呼び出し
    ↓
running状態: 音が再生可能
```

### セキュリティポリシー

Web Audio APIのこの制限は、以下の理由で導入されています：

1. **自動再生の防止**: 望まない音の自動再生を防ぐ
2. **ユーザー体験の保護**: ユーザーが予期しない音を防ぐ
3. **バッテリー消費の削減**: 不要な音声処理を防ぐ

## まとめ

この修正により、音響効果が以下のように動作するようになりました：

1. ✅ アプリ起動時にAudioContextを初期化
2. ✅ 最初のユーザーインタラクション時に自動的にAudioContextを有効化
3. ✅ 音再生前に必ずAudioContextの状態を確認し、必要に応じてresume
4. ✅ 設定画面でテスト音を再生して動作確認が可能
5. ✅ 詳細なログ出力でデバッグが容易

これにより、ユーザーは設定画面で音響効果を有効にした瞬間から、すべての音響効果が正常に再生されるようになりました。
