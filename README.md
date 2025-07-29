# DreadHunger LocalServerLauncher CLI
## 概要 - Overview
CLI経由でDreadHungerのローカルサーバーを立てる
**Frida内蔵なのでサーバーModsをブチ込める**

Launch a local Dread Hunger server via CLI.
**Includes built-in Frida, so you can inject server mods.**


## つかいかた - How to use
releaseからexe落としてきて、こんな感じにコマンド渡す
Download the .exe from the Releases page and run it with a command like this:

```
runner.exe PathToServer.exe GameOption script1?scriptOption1=scriptValue1 script2?scriptOption2=scriptValue2...
```

例-example-

```bat
runner.exe "C:/SteamLibrary/steamapps/common/Dread Hunger/WindowsServer/DreadHunger/Binaries/Win64/DreadHungerServer-Win64-Shipping.exe"
Expanse_Persistent?maxplayers=1?daysbeforeblizzard=7?dayminutes=16?predatordamage=0.25?coldintensity=0.25?hungerrate=0.25?coalburnrate=0.1?thralls=1 ^
consolePipe.js
```

## script option
第三引数以降はfrida scriptを動作させる為のパッチオプションを渡す。
From the third argument onward, you can pass patch options used by the Frida scripts.

runner.exeと同じディレクトリにscriptsディレクトリがあり、かつその下にpatch.jsがある時、
If there’s a scripts directory located next to runner.exe, and patch.js exists inside it, then:

```
patch.js?REPLACE_STRING='replaced!'
```
と書くとpatch.jsを読み込んだ上でREPLACE_STRINGを'replaced!'に置き換えてインジェクトする。
will load patch.js and inject it with REPLACE_STRING replaced by 'replaced!'.

もし変数の置き換えが必要ない場合は、単に`patch.js`だけで良い。
If no variable replacement is needed, simply passing patch.js is enough.