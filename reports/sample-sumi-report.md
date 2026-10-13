# サンプル「墨文字」— 素材の取得で停止

- リポジトリ: `~/xr-ar-lab`、ブランチ `sample-sumi`（main から分岐。**main へのマージ・push はしていない**）
- 作成日: 2026-10-14
- 指示: `sample-sumi.md` ＋ 補足 (a) Wikimedia Commons の PD 画像を使う / (b) 一覧ページは作らない

## 結果：着手前に停止した

**`samples-ar/sumi/assets/sumi.jpg` を用意できなかったため止めた。** 補足 (a) の
「ThinkPad から直接 curl で取得できなければ手順をレポートに書いて止める」に従っている。

- `commons.wikimedia.org` への `curl` が、このセッションでは **2 回とも実行許可を拒否された**
  （1 回目は他のコマンドとまとめて、2 回目は API への単発の要求）。
  ネットワークのエラーではなく、実行の許可が出なかった。
  そのため、ThinkPad から Commons に実際につながるかどうかは**確かめられていない**。
- 仕様どおり、プレースホルダ画像は置いていない。`samples-ar/` も作っていない。
- `showcase/` 以下は**一切触っていない**（共通化は始めていない）。公開中の名刺 AR には影響しない。
- このブランチで追加したのはこのレポートだけ。

あわせて分かったこと：`make-sample.py` で使う予定の OpenCV（`cv2`）は、システムの Python にも
`~/.venvs/showcase` にも入っていない。再開する前に PyPI から入れる必要がある（手順 3）。

---

## 再開の手順

### 1. 実行の許可

次のどちらかで進められる。

- 再開するセッションで `curl` による `commons.wikimedia.org` / `upload.wikimedia.org` へのアクセスと
  `pip install` を許可する
- または以下のコマンドを Nao が直接（Claude Code なら `! ` を前に付けて）実行し、
  結果をこのセッションに渡す

### 2. 候補の探し方（3 件を選んで記録する）

優先度は補足どおり、**『南無阿弥陀仏』 → 禅語の一行書 → 円相図**。

```bash
cd ~/xr-ar-lab/samples-ar/sumi/assets   # mkdir -p してから

# ファイル名前空間（6）を検索。語を変えて何度か引く
API='https://commons.wikimedia.org/w/api.php'
for q in '南無阿弥陀仏 書' 'Namu Amida Butsu calligraphy' 'Zen calligraphy ichigyosho' \
         '墨跡' 'bokuseki' 'Hakuin calligraphy' 'Enso Zen'; do
  curl -sG "$API" --data-urlencode "srsearch=$q" \
    -d action=query -d format=json -d list=search -d srnamespace=6 -d srlimit=20 \
    | python3 -c 'import sys,json; [print(r["title"]) for r in json.load(sys.stdin)["query"]["search"]]'
done

# 候補ごとにライセンス・作者・年代・原寸 URL を引く
T='File:XXXX.jpg'
curl -sG "$API" --data-urlencode "titles=$T" \
  -d action=query -d format=json -d prop=imageinfo \
  -d iiprop='url|size|extmetadata' \
  | python3 -m json.tool | grep -E '"(url|descriptionurl|width|height)"|LicenseShortName|Artist|DateTimeOriginal|Credit' -A1
```

採用条件：

| 項目 | 条件 |
|---|---|
| ライセンス | `LicenseShortName` が **Public domain / CC0** のもの（`PD-Art`、`PD-old-100`、`PD-Japan` など）。CC BY / CC BY-SA は採らない |
| 作者の没年 | 江戸期以前の書を優先する。近代の作者の場合は没年を確認し、Commons ページの PD 表示の根拠（PD-old-100 など）を `SOURCES.md` に写しておく |
| 構図 | 文字が大きく、紙の余白が四方に残っている。表装（掛軸の布）が写り込んでいても、本紙の四隅が分かれば可 |
| 画質 | 長辺 2000px 以上が目安。スキャンでも写真でも可 |

### 3. 取得と記録

```bash
# 採用する 1 枚（imageinfo の "url" = upload.wikimedia.org の原寸）
curl -L -o sumi.jpg 'https://upload.wikimedia.org/wikipedia/commons/x/xx/XXXX.jpg'
#   PNG / TIFF のときは Pillow で JPEG にする

# OpenCV（make-sample.py の四隅検出と射影変換で使う）
~/.venvs/showcase/bin/pip install opencv-python-headless
```

`samples-ar/sumi/assets/SOURCES.md` には **3 候補とも**次の形で記録し、採用した 1 枚に印を付ける。

```markdown
| | 題 | 作者 | 年代 | ライセンス | 出典 | 原寸 |
|---|---|---|---|---|---|---|
| ✅ 採用 | … | … | … | Public domain (PD-Art/PD-old-100) | https://commons.wikimedia.org/wiki/File:… | 3000×4500 |
```

### 4. 再開

素材がそろったら、同じ指示（`sample-sumi.md` ＋ 補足 (b)）でこのブランチから再開できる。
補足 (a) の取得部分は、`sumi.jpg` と `SOURCES.md` が既にあれば飛ばしてよい。

---

## 次回のための設計メモ（showcase のコードを読んで決めたこと。未実装）

再開時に読み直さずに済むよう、読んだ範囲で決めた方針を残しておく。

- **共通化の方法**: `showcase/ar/*.js` は全モジュールが `./config.js` を、`main.js` は `./targets.js` を
  相対 import している。`shared/ar-core/` に移すモジュールでは、これらを裸の指定子
  `'ar-config'` / `'ar-targets'` にして、各ページの importmap で自分のファイルに解決させる
  （`showcase/index.html` は既に `"three"` を importmap で解決しているので、そこに 2 行足すだけで済む）。
  共通モジュールはどちらのページでも同じファイルのまま読まれる。selftest は `?sample=` を見て
  importmap を動的に挿してから module を読む。
- **config の差分**: showcase の現行値を `shared/ar-core/defaults.js` に置き、
  `showcase/ar/config.js` はそれをそのまま再エクスポート（＋カード寸法・バリアント・循環）、
  `samples-ar/sumi/ar/config.js` は上書きする値だけを書く。
- **墨の点の色**: シェーダは `uInk * aLum` で色を出すので、sumi では `ink` に紙色を入れ、
  `l` に墨の明度（濃い墨ほど小さい）を入れれば、シェーダを変えずに「暗い点・にじみは薄い点」になる。
- **煙のように立ち上る**: 現行シェーダは散った点の落下をカードの −y に固定している。上向きの成分を
  `tilt.downLocal`（カードローカルの実際の「下」）から作る uniform を足し、showcase の既定値では
  今と同じ式になるようにする。
- **縦長ターゲット**: `cardPoseFromDetail` は横長 PNG のとき（エンジンが 90° 回して読む）だけ roll を入れる。
  半紙は縦長なので roll は 0 になる。ただし縦長での軸の向きは実測していないので、前回と同じ偽カメラ
  （y4m）の手順で確かめてから進める。
- **ログの接頭辞**: `[showcase]` を config から引くようにし、showcase の出力は変えない
  （前回レポートの確認手順がこの文字列で grep している）。
