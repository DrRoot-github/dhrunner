// トーテム無敵

const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;

const ADH_ThrallTotem_BeginPlay = new NativeFunction(
  base.add(0xe609c0),
  "void",
  ["pointer"]
);
const AActor_SetCanBeDamaged = new NativeFunction(base.add(0x22e9370), "void", [
  "pointer",
  "bool",
]);

Interceptor.attach(ADH_ThrallTotem_BeginPlay, {
  onEnter(args) {
    AActor_SetCanBeDamaged(args[0], 0);
  },
});
