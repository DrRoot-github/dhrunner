const base = Process.getModuleByName('DreadHungerServer-Win64-Shipping.exe').base

const FWindowsConsoleOutputDevice_Serialize = base.add(0x13ae760)

/**
 * -logで出したログウィンドウにしか出ないようなログまで全部キャッチして吐く
 */
Interceptor.attach(FWindowsConsoleOutputDevice_Serialize,{
  onEnter(args){
    // wchar_t*
    const text = args[1]
    console.log(text.readUtf16String())
  },
})