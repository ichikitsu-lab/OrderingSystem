#!/usr/bin/env python3
import wave
import struct
import math

def generate_beep(filename, frequency, duration_ms, sample_rate=44100):
    """
    ビープ音を生成してWAVファイルとして保存
    """
    num_samples = int(sample_rate * duration_ms / 1000)
    
    with wave.open(filename, 'w') as wav_file:
        # パラメータ設定: (チャンネル数, サンプル幅, サンプルレート, フレーム数, 圧縮タイプ, 圧縮名)
        wav_file.setparams((1, 2, sample_rate, num_samples, 'NONE', 'not compressed'))
        
        # サウンドデータ生成
        for i in range(num_samples):
            t = i / sample_rate
            # サイン波を生成（音量を0.3に設定）
            value = int(32767 * 0.3 * math.sin(2 * math.pi * frequency * t))
            # フェードアウト効果
            fade = 1.0 - (i / num_samples) * 0.7
            value = int(value * fade)
            # 16ビット整数としてパック
            data = struct.pack('<h', value)
            wav_file.writeframes(data)

# 注文確定音 (2つのビープ音)
print("注文確定音を生成中...")
generate_beep('assets/sounds/order_confirm_1.wav', 800, 200)
generate_beep('assets/sounds/order_confirm_2.wav', 1000, 200)

# 支払い完了音 (3つのビープ音)
print("支払い完了音を生成中...")
generate_beep('assets/sounds/payment_complete_1.wav', 600, 150)
generate_beep('assets/sounds/payment_complete_2.wav', 800, 150)
generate_beep('assets/sounds/payment_complete_3.wav', 1000, 300)

print("✅ 音声ファイルの生成が完了しました！")
