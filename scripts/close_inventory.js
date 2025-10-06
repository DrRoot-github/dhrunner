const base = Module.findBaseAddress(
	'DreadHungerServer-Win64-Shipping.exe'
);

// GWorld = UWorldProxyなのでポインタ一枚剥がす
const gWorld = base.add(0x46ed420).readPointer();

// UDH_GameplayStatics::GetDHPlayerController(UObject const *,int)	0000000000E8F020
const GetDHPlayerController = new NativeFunction(
	base.add(0xe8f020),
	'pointer',
	['pointer', 'int']
);

// UDH_InventoryTransactionComponent * UDH_InventoryTransactionComponent::Get(const AController *InController)
const UDH_InventoryTransactionComponent__Get = new NativeFunction(
	base.add(0xe33890),
	'pointer',
	['pointer']
);

const CloseLootInterface = new NativeFunction(
	base.add(0xe30070),
	'void',
	['pointer']
);

// AActor::FlushNetDormancy(AActor *this)	00000000022D7B20
const FlushNetDormancy = new NativeFunction(
	base.add(0x22d7b20),
	'void',
	['pointer']
);

function FlushAll(ADHPlayerController) {
	//
	console.log('FlushAll executed.');

	// ADH_PlayerController
	const target = [
		[0x0e0, 'AActor *Owner;'],
		[0x228, 'APlayerState *PlayerState;'],
		[0x250, 'APawn *Pawn;'],
		[0x260, 'ACharacter *Character;'],
		[0x2a0, 'APawn *AcknowledgedPawn;'],
		[0x2b0, 'AHUD *MyHUD;'],
		[0x2b8, 'APlayerCameraManager *PlayerCameraManager;'],
		[0x548, 'ASpectatorPawn *SpectatorPawn;'],
		[0x588, 'ADH_HumanCharacter *ControlledHuman'],
		[0x658, 'ADH_PlayerState *DHPlayerState;'],
		[0x660, 'ADH_GameState *DHGameState;'],
		[0x7c8, 'ADH_RoleCustomizationAvatar *PlayerAvatar;'],
		[0x7d8, 'ADH_ShipCustomizationAvatar *ShipAvatar;']
	];

	target.forEach(([addr, name]) => {
		const tgt = ADHPlayerController.add(addr).readPointer();
		if (!tgt.isNull()) {
			FlushNetDormancy(tgt);
		}
		console.log(`FlushNetDormancy: ${addr.toString(16)} ${name}`);
	});

	// 0x120     TArray<AActor *,TSizedDefaultAllocator<32> > Children;
	const children = ADHPlayerController.add(0x120);
	if (!children.isNull()) {
		const len = children.add(0x8).readInt();
		for (let i = 0; i < len; i++) {
			const child = children
				.readPointer()
				.add(8 * i)
				.readPointer();
			if (!child.isNull()) {
				console.log(`child component ${i} Flushed.`);
				FlushNetDormancy(child);
			}
		}
	}
}

for (let i = 0; i < 8; i++) {
	const pcon = GetDHPlayerController(gWorld, i);
	if (!pcon.isNull()) {
		FlushAll(pcon);

		const transaction = UDH_InventoryTransactionComponent__Get(pcon);
		if (!transaction.isNull()) {
			CloseLootInterface(transaction);
		}
	}
}
