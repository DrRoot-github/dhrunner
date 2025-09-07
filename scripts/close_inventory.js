const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;

// GWorld = UWorldProxyなのでポインタ一枚剥がす
const gWorld = base.add(0x46ed420).readPointer();

// UDH_GameplayStatics::GetDHPlayerController(UObject const *,int)	0000000000E8F020
const GetDHPlayerController = new NativeFunction(
  base.add(0xe8f020),
  "pointer",
  ["pointer", "int"]
);

// UDH_InventoryTransactionComponent * UDH_InventoryTransactionComponent::Get(const AController *InController)
const UDH_InventoryTransactionComponent__Get = new NativeFunction(
  base.add(0xe33890),
  "pointer",
  ["pointer"]
);

const CloseLootInterface = new NativeFunction(base.add(0xe30070), "void", [
  "pointer",
]);

for (let i = 0; i < 8; i++) {
  const pcon = GetDHPlayerController(gWorld, i);
  if (!pcon.isNull()) {
    const transaction = UDH_InventoryTransactionComponent__Get(pcon);
    if (!transaction.isNull()) {
      CloseLootInterface(transaction);
    }
  }
}
