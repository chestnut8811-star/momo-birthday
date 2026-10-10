#!/usr/bin/env python3
"""雪だるまのせりふを VOICEVOX で音声ファイル（m4a）に書き出し、app/voice/ に置く。

使い方: VOICEVOX（エンジン）を起動した状態で
    python3 tools/make-voices.py
声やせりふを変えたいときは、下の SPEAKER / LINES を書き換えて実行し直す。
実行後は app/sw.js の VERSION を上げて公開し直すこと（キャッシュを更新するため）。

名前・年齢入りのせりふ（needs）は NAME / AGE で作る。アプリの設定で名前や年齢を変えた場合は、
fallback の「名前なし」のせりふに切り替わる。
"""
import json
import pathlib
import subprocess
import sys
import urllib.parse
import urllib.request

ENGINE = 'http://127.0.0.1:50021'
SPEAKER = 1  # ずんだもん（あまあま）
CREDIT = 'VOICEVOX:ずんだもん'
NAME = 'ももちゃん'
AGE = 4
PARAMS = {'speedScale': 0.95, 'intonationScale': 1.15, 'prePhonemeLength': 0.05, 'postPhonemeLength': 0.12}

LINES = {
    'hello': {'text': f'{NAME}、{AGE}さいの おたんじょうび おめでとう！', 'needs': ['name', 'age'], 'fallback': 'hello_g'},
    'hello_g': {'text': 'おたんじょうび おめでとう！'},
    'sing': {'text': 'まずは みんなで おうたを うたおう！'},
    'blow': {'text': 'さあ、ろうそくを ふーって けしてね！'},
    'again': {'text': 'もういっかい、ふーって してね！'},
    'allOut': {'text': 'やったー！ ぜんぶ きえたよ！ おめでとう！'},
    'tapHint': {'text': 'ひを タッチしても けせるよ！'},
    'toMemories': {'text': f'{NAME}の おもいでを みてみよう！', 'needs': ['name'], 'fallback': 'toMemories_g'},
    'toMemories_g': {'text': 'おもいでを みてみよう！'},
    'memTitle': {'text': f'{NAME}の おもいでだよ！', 'needs': ['name'], 'fallback': 'memTitle_g'},
    'memTitle_g': {'text': 'たのしい おもいでだよ！'},
    'rub': {'text': 'こおりを こすって みてね！'},
    'finale': {'text': f'{NAME}、だいすきだよ！ おたんじょうび おめでとう！', 'needs': ['name'], 'fallback': 'finale_g'},
    'finale_g': {'text': 'だいすきだよ！ おたんじょうび おめでとう！'},
}


def post(path, data=None, timeout=120):
    req = urllib.request.Request(
        ENGINE + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    out = root / 'app' / 'voice'
    out.mkdir(parents=True, exist_ok=True)
    try:
        version = urllib.request.urlopen(ENGINE + '/version', timeout=5).read().decode()
    except OSError:
        sys.exit('VOICEVOX のエンジンが起動していません（127.0.0.1:50021）。VOICEVOX を起動してから実行してください。')

    meta = {'credit': CREDIT, 'speaker': SPEAKER, 'engine': json.loads(version), 'name': NAME, 'age': AGE, 'lines': {}}
    for key, line in LINES.items():
        query = json.loads(post(f'/audio_query?speaker={SPEAKER}&text=' + urllib.parse.quote(line['text'])))
        query.update(PARAMS)
        wav = out / f'{key}.wav'
        wav.write_bytes(post(f'/synthesis?speaker={SPEAKER}', query))
        m4a = out / f'{key}.m4a'
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', str(wav), str(m4a)], check=True)
        wav.unlink()
        meta['lines'][key] = {k: v for k, v in line.items() if k != 'text'} | {'file': f'{key}.m4a', 'kana': query.get('kana', '')}
        print(f'{key:13s} {m4a.stat().st_size:6d} bytes  {query.get("kana", "")}')

    (out / 'voice.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'書き出し先: {out}')


if __name__ == '__main__':
    main()
