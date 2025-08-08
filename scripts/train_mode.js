// スペルクールタイム無し、マナ最小値Lv1、弾と注射減らない、マスケ即空き、クラフト0秒

const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;

const adhHumanCharacterAddStartingInventoryAddr = base.add(0xd46f10);
const adhSpellManagerCastSpellAddr = base.add(0xe634f0);
const aActorSetCanBeDamaged = new NativeFunction(base.add(0x22e9370), "void", [
  "pointer",
  "bool",
]);
const adhHumanCharacterBegin = base.add(0xd49150);

function resetSpells(SpellManager) {
  if (SpellManager.isNull()) {
    return;
  }
  const SpellChargeLevel = SpellManager.add(0x284);
  SpellChargeLevel.writeFloat(0.24);
}

Interceptor.attach(adhHumanCharacterAddStartingInventoryAddr, {
  onEnter: (args) => {
    const PlayerState = args[0].add(0x240).readPointer();
    const SpellManager = PlayerState.add(0x488).readPointer();
    resetSpells(SpellManager);
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArraySize(tArray) {
  return tArray.add(8).readU32();
}

function getArrayItemAddr(tArray, size, index) {
  const ArrNum = getArraySize(tArray);
  if (index > ArrNum) return null;
  return tArray.readPointer().add(index * size);
}

async function Reducecooling(SpellManager) {
  await sleep(1000);
  const SpellCooldowns = SpellManager.add(0x2a8);
  for (let i = 0; i < getArraySize(SpellCooldowns); i++) {
    const SpellCooldown = getArrayItemAddr(SpellCooldowns, 16, i);
    const ServerUsedTime = SpellCooldown.add(8);
    ServerUsedTime.writeFloat(ServerUsedTime.readFloat() - 300);
  }
  resetSpells(SpellManager);
}

Interceptor.attach(adhSpellManagerCastSpellAddr, {
  onEnter: (args) => {
    const SpellManager = args[0];
    Reducecooling(SpellManager);
  },
});

// craft即終了
const udhCraftingComponentStartNewProject = base.add(0xdac790);
Interceptor.attach(udhCraftingComponentStartNewProject, {
  onLeave(retval) {
    if (!retval.isNull()) {
      //   const pUdhCraftingRecipe = retval.add(0x28);
      const pRemainingTime = retval.add(0x48);

      pRemainingTime.writeFloat(0.001);
    }
  },
});

// マスケ即空き
const adhArmoryDoorTickAddr = base.add(0xe73240);
Interceptor.attach(adhArmoryDoorTickAddr, {
  onLeave() {
    // なんでこれで上手くいくか知らん
    this.context.rax = 1;
  },
});

// インベントリからアイテムが消える(1→0になる)時呼ばれる
const decreaseItemStack = base.add(0xdc56d0);
function replaceDecreaseFunc() {
  Interceptor.replace(
    decreaseItemStack,
    new NativeCallback(
      (ptr, delta) => {
        // console.log(`delta: ${delta}`)
        Interceptor.revert(decreaseItemStack);
      },
      "void",
      ["pointer", "int", "bool", "bool"]
    )
  );
}

// 自分含む何かしらのオブジェクトに攻撃当てると呼ばれる
// args[0]=thisはADH_Weapon_Melee型でこいつはADH_Weapon → ADH_Inventoryと継承してる
// でこいつの直後にdecreaseが呼ばれるから注射をmeleehitさせた時だけ次回のdecreaseの呼び出しを無視させる
const onMeleeWeaponHit = base.add(0xf0ad20);

Interceptor.attach(onMeleeWeaponHit, {
  onEnter(args) {
    // ADH_Weapon_Melee this*, FHitResult hit*, u8 AttackState*
    // 注射だと41 アヘンは40
    const invType = args[0].add(0x290).readU8();
    if (invType === 41) {
      replaceDecreaseFunc();
    }

    // console.log("onMeleeHit",invType)
  },
});

// 弾減らない
const adhWeaponRangedOnReloadComplete = base.add(0xe0e600);
Interceptor.attach(adhWeaponRangedOnReloadComplete, {
  onEnter() {
    // 長物は対応する弾を減らした後親クラスであるInventoryのreloadCompleteを呼ぶ
    // その時弾を減らす処理をするので注射同様次のアイテム減らす処理を飛ばす
    replaceDecreaseFunc();
    // console.log("debug on")
  },
});
