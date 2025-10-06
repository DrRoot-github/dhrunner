// トーテム無敵

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

Interceptor.attach(ADH_ThrallTotem_BeginPlay, {
	onEnter(args) {
		AActor_SetCanBeDamaged(args[0], 0);
	}
});
