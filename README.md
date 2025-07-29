# DreadHunger LocalServerLauncher CLI
## �T�v - Overview
CLI�o�R��DreadHunger�̃��[�J���T�[�o�[�𗧂Ă�
**Frida�����Ȃ̂ŃT�[�o�[Mods���u�`���߂�**

Launch a local Dread Hunger server via CLI.
**Includes built-in Frida, so you can inject server mods.**


## �������� - How to use
release����exe���Ƃ��Ă��āA����Ȋ����ɃR�}���h�n��\
Download the .exe from the Releases page and run it with a command like this:

```
runner.exe PathToServer.exe GameOption script1?scriptOption1=scriptValue1 script2?scriptOption2=scriptValue2...
```

�� example

```bat
runner.exe "C:/SteamLibrary/steamapps/common/Dread Hunger/WindowsServer/DreadHunger/Binaries/Win64/DreadHungerServer-Win64-Shipping.exe"
Expanse_Persistent?maxplayers=1?daysbeforeblizzard=7?dayminutes=16?predatordamage=0.25?coldintensity=0.25?hungerrate=0.25?coalburnrate=0.1?thralls=1 ^
consolePipe.js
```

## script option
��O�����ȍ~��frida script�𓮍삳����ׂ̃p�b�`�I�v�V������n���B\
From the third argument onward, you can pass patch options used by the Frida scripts.

runner.exe�Ɠ����f�B���N�g����scripts�f�B���N�g��������A�����̉���patch.js�����鎞�A\
If there�fs a scripts directory located next to runner.exe, and patch.js exists inside it, then:

```
patch.js?REPLACE_STRING='replaced!'
```
�Ə�����patch.js��ǂݍ��񂾏��REPLACE_STRING��'replaced!'�ɒu�������ăC���W�F�N�g����B\
will load patch.js and inject it with REPLACE_STRING replaced by 'replaced!'.

�����ϐ��̒u���������K�v�Ȃ��ꍇ�́A�P��`patch.js`�����ŗǂ��B\
If no variable replacement is needed, simply passing patch.js is enough.