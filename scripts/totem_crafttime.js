const base = Module.findBaseAddress("DreadHungerServer-Win64-Shipping.exe");

const configs = {
  time: 6
};

rpc.exports = {
  setValue(key, value) {
    console.log(`[totem_crafttime.js] set ${key} to ${value}`);
    configs[key] = +value;
  }
};

const FName__ToString = new NativeFunction(base.add(0x1166e70), 'void', ['pointer', 'pointer']);
var FName_GetPlainNameString = new NativeFunction(base.add(0x11604F0), 'void', ['pointer', 'pointer'], 'win64');

function FNameToString(FName) {
  const FString = Memory.alloc(8);
  FName__ToString(FName, FString);

  // FString -> TArray(0x08:int ArrayNum)
  const len = FString.add(8).readU32();
  return FString.readPointer().readUtf16String(len);
}
const udhCraftingComponentStartNewProject = base.add(0xdac790);

Interceptor.attach(udhCraftingComponentStartNewProject, {
  onEnter(args) {
    this.privateName = FNameToString(args[1].add(0x18));
  },
  onLeave(retval) {
    if (!retval.isNull()) {
      if (this.privateName == 'CR_Totem') {
        const pRemainingTime = retval.add(0x48);
        pRemainingTime.writeFloat(configs.time);
      }
    }
  }
});
