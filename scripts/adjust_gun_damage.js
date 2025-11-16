const configs = {
  BP_Musket_Inventory_C: 1,
  BP_Flintlock_Inventory_C: 1
};

rpc.exports = {
  setValue(key, value) {
    console.log(`set ${key} to ${value}`);
    configs[key] = +value;
  }
};

const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;

const _FNameToString = new NativeFunction(base.add(0x1166e70), "void", [
  "pointer",
  "pointer",
]);

function FNameToString(FName) {
  const FString = Memory.alloc(8);
  _FNameToString(FName, FString);

  // FString -> TArray(0x08:int ArrayNum)
  const len = FString.add(8).readU32();
  return FString.readPointer().readUtf16String(len);
}

// DBE260 ; void __fastcall ADH_Inventory::BeginPlay(ADH_Inventory *this)
Interceptor.attach(base.add(0xDBE260), {
  onEnter(args) {
    this.baseDamage = args[0].add(0x868)
    this.namePrivate = FNameToString(args[0].add(0x18))  // fname
  },

  onLeave() {
    Object.entries(configs).forEach(([key, value]) => {
      // console.log(key, value, this.namePrivate)
      if (this.namePrivate.startsWith(key)) {
        this.baseDamage.writeFloat(this.baseDamage.readFloat() * value)
      }
    })
  }
})