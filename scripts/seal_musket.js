const configs = {
  count: 4,
};

rpc.exports = {
  setValue(key, value) {
    console.log(`set ${key} to ${value}`);
    configs[key] = +value;
  },
};

const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;

// 箱だの何だの開けるとだいたい呼ばれる 野生動物のスポーン時にも呼ばれる
const UDH_DropTable__GenerateGuaranteedDrops = new NativeFunction(
  base.add(0xdc9010),
  "int64",
  ["pointer", "pointer"]
);

// 箱とか開けた時呼ばれる
const UDH_DropTable__GenerateRandomDrops = new NativeFunction(
  base.add(0xdc9260),
  "void",
  ["pointer", "pointer", "int", "pointer", "pointer"]
);

const FName__ToString = new NativeFunction(base.add(0x1166e70), "void", [
  "pointer",
  "pointer",
]);

/**
 * UDH_DropTable -> UObject
 * 0x18 FName NamePrivate exmaple:DT_ArmoryBox_Musket, DT_StrongBoxThrall...
 * 0x40 TArray<FDH_InventoryList> Table
 *
 * FDH_InventoryListはBPのDropTable型で定義されてるやつそのもの↓
 * 0x00 TArray<ADH_Inventory*> InventoryList
 * 0x10 float Weight;
 * 0x14 int GuaranteedSpawns;
 * 0x18 int MaximumSpawns;
 * 0x1C int StackSizeToSpawn;
 * 0x20 int CurrentSpawns;
 *
 * 多分DropTable関係のオブジェクトを触るとGuaranteedとRandom両方のDrop処理が行われて、
 * GuaranteedSpawnsの値に応じてそれぞれがドロップ処理をやってる と思う
 * 処理は必ずGuaranteedの方が先に行われる
 *
 * StackSizeToSpawn は一回に何個ドロップするか 5とかにするとマスケ5本生える
 * 火薬みたいなアイテムだとスタックされる
 * Maxmumの方はよく分からん これだけ弄っても何も起きんかった
 */

Interceptor.attach(UDH_DropTable__GenerateGuaranteedDrops, {
  onEnter: function (args) {
    const privateName = FNameToString(args[0].add(0x18));
    if (privateName == "DT_ArmoryBox_Musket") {
      if (configs.count > 0) {
        configs.count--;
      } else {
        const table = args[0].add(0x40);
        const tableArrayNum = table.add(0x8);

        const len = tableArrayNum.readU32();
        const sizeOfInventoryList = 0x28;

        for (let i = 0; i < len; i++) {
          table
            .readPointer()
            .add(i * sizeOfInventoryList)
            .add(0x1c)
            .writeU32(0);
        }
      }
    }
  },
});

function FNameToString(FName) {
  const FString = Memory.alloc(8);
  FName__ToString(FName, FString);

  // FString -> TArray(0x08:int ArrayNum)
  const len = FString.add(8).readU32();
  return FString.readPointer().readUtf16String(len);
}
