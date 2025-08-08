// Nサボ
const configs = {
  spellList: [0, 4, 3, 1, 2],
};

rpc.exports = {
  setValue(key, value) {
    console.log(`set ${key} to ${value}`);
    const ary = JSON.parse(value);
    if (ary.length <= 5) configs[key] = JSON.parse(value);
  },
};

const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;

/*

spell value
0: cannibal attack
1: whiteout
2: doppel
3: spirit
4: hush

spell arrange(index)
--2---3--
1-------4
----0----
*/

//spellManager
const adhspellManagerSetEquippedSpellsAddr = base.add(0xe81f00);

const udhGameInstanceGetInstance = new NativeFunction(
  base.add(0xd93240),
  "pointer",
  ["pointer"]
);

function getArraySize(tArray) {
  return tArray.add(8).readU32();
}
function getArrayItemAddr(tArray, size, index) {
  const ArrNum = getArraySize(tArray);
  if (index > ArrNum) return null;
  return tArray.readPointer().add(index * size);
}

// Interceptor内でallocするとaccess violationで死ぬ
const spellList = Memory.alloc(0x100);
spellList.writePointer(spellList.add(16));
Interceptor.attach(adhspellManagerSetEquippedSpellsAddr, {
  onEnter: (args) => {
    // spellList:TArray<TotemSpell>
    spellList.add(12).writeU32(configs.spellList.length);
    const spellManager = args[0];

    // spellManager:0x228 int MaxSpells
    spellManager.add(0x228).writeU32(configs.spellList.length);
    const GameInstance = udhGameInstanceGetInstance(spellManager);
    const ThrallSpells = GameInstance.add(0x440);

    spellList.add(8).writeU32(configs.spellList.length);
    for (let i = 0; i < configs.spellList.length; i++) {
      const spellType = getArrayItemAddr(ThrallSpells, 8, configs.spellList[i]);
      spellList.add(16 + 8 * i).writePointer(spellType.readPointer());
    }
    args[1] = spellList;
  },
});
