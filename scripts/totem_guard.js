// トーテム無敵

const configs = {
	// trueにすると船上トーテムだけ破壊可能になる
	exceptShip: false
};

rpc.exports = {
	setValue(key, value) {
		console.log(`set ${key} to ${value}`);
		configs[key] = !!+value;
	}
};

const base = Module.findBaseAddress(
	'DreadHungerServer-Win64-Shipping.exe'
);

const ADH_ThrallTotem_BeginPlay = new NativeFunction(
	base.add(0xe609c0),
	'void',
	['pointer']
);
const AActor_SetCanBeDamaged = new NativeFunction(
	base.add(0x22e9370),
	'void',
	['pointer', 'bool']
);

// E39820 ; ADH_PlayerController *__fastcall ADH_PlayerState::GetOwningController(ADH_PlayerState *this)
const GetOwningController = new NativeFunction(
	base.add(0xe39820),
	'pointer',
	['pointer']
);

Interceptor.attach(ADH_ThrallTotem_BeginPlay, {
	onEnter(args) {
		if (configs.exceptShip) {
			const instigator = args[0].add(0x118).readPointer();
			const controller = GetOwningController(
				instigator.add(0x240).readPointer()
			);
			const humanCharacter = controller.add(0x588).readPointer();
			const shipBase = humanCharacter.add(0x9f8).readPointer();
			if (shipBase.isNull()) {
				AActor_SetCanBeDamaged(args[0], 0);
			}
		} else {
			AActor_SetCanBeDamaged(args[0], 0);
		}
	}
});
