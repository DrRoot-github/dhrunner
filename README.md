# DreadHunger LocalServerLauncher CLI

## 概要 - Overview

CLI 経由で DreadHunger のローカルサーバーを立てる
**Frida 内蔵なのでサーバー Mods をブチ込める**

Launch a local Dread Hunger server via CLI.
**Includes built-in Frida, so you can inject server mods.**

## つかいかた - How to use

release から exe 落としてきて、こんな感じにコマンド渡す\
Download the .exe from the Releases page and run it with a command like this:

```
runner.exe PathToServer.exe GameOption script1?scriptOption1=scriptValue1 script2?scriptOption2=scriptValue2...
```

例 example

```bat
runner.exe "C:/SteamLibrary/steamapps/common/Dread Hunger/WindowsServer/DreadHunger/Binaries/Win64/DreadHungerServer-Win64-Shipping.exe"
Expanse_Persistent?maxplayers=1?daysbeforeblizzard=7?dayminutes=16?predatordamage=0.25?coldintensity=0.25?hungerrate=0.25?coalburnrate=0.1?thralls=1 ^
consolePipe.js rand_role.js seal_musket.js?count=3
```

## script option

第三引数以降は frida script を動作させる為のパッチオプションを渡す。\
From the third argument onward, you can pass patch options used by the Frida scripts.

runner.exe と同じディレクトリに scripts ディレクトリがあり、かつその下に patch.js がある時、\
If there’s a scripts directory located next to runner.exe, and patch.js exists inside it, then:

```
patch.js?REPLACE_STRING='replaced!'
```

と書くと patch.js を読み込んだ上で REPLACE_STRING を'replaced!'に置き換えてインジェクトする。\
will load patch.js and inject it with REPLACE_STRING replaced by 'replaced!'.

もし変数の置き換えが必要ない場合は、単に`patch.js`だけで良い。\
If no variable replacement is needed, simply passing patch.js is enough.

実行後も入力を受け付けてるので、script 名を渡すと即時実行される。

## script list

### additional_roles.js

日本で人気の狂人船。

### close_inventory.js

即時実行するとインタラクトが解除される。

### consolePipe.js

内部で発生するログメッセージを標準出力に流す。サーバーなどで、詳細な動作ログを拾いたい場合に。

Redirects internal log messages to standard output. Useful when you want to capture detailed activity logs, such as on a server.

### die_instantly.js

ダウン時に即死するようになる。

Causes instant death when downed.

### no_spyglass.js

探検家が、鍵箱から望遠鏡を入手できなくなる。

Prevents expeditioners from obtaining a spyglass from strong boxes.

### rand_role.js

役職配布がランダムになる。

Randomizes role assignments.

### seal_musket.js

パラメータ`count`に 0~4 の数字を渡すと、マスケット銃がその本数までしか入手できなくなる。

Limits the number of muskets obtainable. Pass a number from 0 to 4 to the `count` parameter.

マスケット 2 本まで/Limit to 2 muskets
`seal_musket.js?count=2`

### spell_cast_start.js

ゲーム開始時にレベル 1 相当の Hush が発生する。

Triggers a level-1 equivalent Hush at the start of the game.

### spell_charge_fix.js

ゲーム開始時の闇の傀儡のマナを変更する。デフォルトは 0.06。\
パラメータ`mana`に 0~1.0 を設定することで変更できる。

Changes the starting mana for the Thralls. Default is 0.06.\
You can modify it by setting the `mana` parameter to a value between 0 and 1.0.

例 初期マナ 8 割チャージ/Start with 80% mana charged
`spell_charge_fix.js?mana=0.8`

### spell_custom.js

闇の傀儡の使用できる呪文を設定できる。デフォルトは[0,4,3,1,2]。\
パラメータ`spellList`に配列を渡すと設定を変更できる。

Configures the available spells for the Thralls. Default is [0,4,3,1,2].\
Pass an array to the `spellList` parameter to change the configuration.

0. 人食い人種攻撃 / Cannibal Attack
1. ホワイトアウト / Whiteout
2. ドッペルゲンガー / Doppelganger
3. 幽霊歩き / Spirit Walk
4. 沈黙 / Hush

で、真下の位置から時計回りに設定される。\
They are set clockwise starting from the bottom position.

例 下から人食い人種攻撃、ホワイトアウト、ドッペルゲンガー、幽霊歩きの 4 つ\
Example: From bottom — Cannibal Attack, Whiteout, Doppelganger, Spirit Walk:
`spell_custom.js?spellList=[0,1,2,3]`

注意 数字を`[]`で囲うのを忘れたり、5 以上の数値を渡すとクラッシュする。\
Note: Forgetting to enclose numbers in `[]` or passing values over 4 will cause a crash.

### totem_guard.js

トーテムが破壊できなくなる。

Makes totems indestructible.

### train_mode.js

練習モードで開始できる。

Enables training mode.

- マナが常時減らなくなる / Mana does not decrease
- マスケット銃を即座に入手できる / Instantly obtain a musket
- 呪文のクールダウンが無い / No cooldown for spells
- 矢と銃を消費なしでリロードできる / Reload bows and guns without consuming ammo
- 注射を消費なしで使用できる / Use syringes without consuming them

## 自分で script を追加するには？ / How to Add Your Own Scripts

~~
このランチャーは frida ver17~を使っているので、`Module.findBaseAddress`が使えない。\
もしスクリプトを追加したい場合は、\
`Module.findBaseAddress('DreadHungerServer-Win64-Shipping.exe')`を`Process.getModuleByName('DreadHungerServer-Win64-Shipping.exe').base`に書き換えると動作する。
~~

あとは js ファイルを script ディレクトリに置き、コマンドラインからファイル名を渡せば良い。

~~
This launcher uses Frida version 17+, so `Module.findBaseAddress` is not available.\
If you want to add a new script, replace
`Module.findBaseAddress('DreadHungerServer-Win64-Shipping.exe')`
with
`Process.getModuleByName('DreadHungerServer-Win64-Shipping.exe').base`
~~

After that, place your .js file in the scripts directory and pass the file name via the command line.

0.3で16系に戻した。