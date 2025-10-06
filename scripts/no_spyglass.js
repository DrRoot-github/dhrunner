// 探検家の鍵箱から望遠鏡が出ない

const base = Module.findBaseAddress(
	'DreadHungerServer-Win64-Shipping.exe'
);
const UDH_InventoryManager_AddInventoryFromTable = new NativeFunction(
	base.add(0xdbc5a0),
	'pointer',
	['pointer', 'pointer', 'pointer', 'pointer', 'int8']
);

// (this*, delta, 1, 0) => void
const ADH_Inventory_DecreaseItemStack = new NativeFunction(
	base.add(0xdc56d0),
	'void',
	['pointer', 'int', 'bool', 'bool']
);

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
 */

Interceptor.attach(UDH_InventoryManager_AddInventoryFromTable, {
	onEnter(args) {
		// UDH_InventoryManager *this
		this.self = args[0];

		// TArray<ADH_Inventory *,TSizedDefaultAllocator<32> > *result,
		this.result = args[1];

		// UDH_DropTable *DropTable
		this.DropTable = args[2];
	},

	onLeave() {
		const dtName = FNameToString(this.DropTable.add(0x18));
		if (dtName != 'DT_StrongBox') return;

		// 出たアイテムの数
		const len = this.result.add(8).readU32();

		for (let i = 0; i < len; i++) {
			// ポインタの配列なのでサイズは固定で8
			const inventory = this.result
				.readPointer()
				.add(8 * i)
				.readPointer();
			const itemName = FNameToString(inventory.add(0x18));
			const stackSize = inventory.add(0x8b0).readU8();
			// console.log(dtName, itemName)
			if (itemName.startsWith('BP_Spyglass_Inventory_C')) {
				ADH_Inventory_DecreaseItemStack(inventory, stackSize, 1, 0);
			}
			break;
		}
	}
});

function FNameToString(FName) {
	const _FNameToString = new NativeFunction(
		base.add(0x1166e70),
		'void',
		['pointer', 'pointer']
	);
	const FString = Memory.alloc(8);
	_FNameToString(FName, FString);

	// FString -> TArray(0x08:int ArrayNum)
	const len = FString.add(8).readU32();
	return FString.readPointer().readUtf16String(len);
}

function FTextToString(FText) {
	// FString* FText::ToString(FText *this)
	const _FTextToString = new NativeFunction(
		base.add(0x10af640),
		'pointer',
		['pointer']
	);
	const fstr = _FTextToString(FText);
	const len = fstr.add(8).readU32();
	return fstr.readPointer().readUtf16String(len);
}
