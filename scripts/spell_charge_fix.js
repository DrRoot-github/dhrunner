// 初期スペルチャージ操作
const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;

const configs = {
  mana: 0.06,
};

rpc.exports = {
  setValue(key, value) {
    console.log(`set ${key} to ${value}`);
    configs[key] = +value;
  },
};

const adhHumanCharacterAddStartingInventoryAddr = base.add(0xd46f10);

function resetSpells(SpellManager) {
  if (SpellManager.isNull()) {
    return;
  }
  const SpellChargeLevel = SpellManager.add(0x284);
  SpellChargeLevel.writeFloat(SpellChargeLevel.readFloat() + configs.mana);
}

Interceptor.attach(adhHumanCharacterAddStartingInventoryAddr, {
  onEnter: (args) => {
    const PlayerState = args[0].add(0x240).readPointer();
    const SpellManager = PlayerState.add(0x488).readPointer();
    resetSpells(SpellManager);
  },
});
