// 開始と同時に沈黙1

const base = Process.getModuleByName('DreadHungerServer-Win64-Shipping.exe').base


const fActorSpawnParameters = new NativeFunction(
    base.add(0x29584a0),
    "void",
    ["pointer"],
    "win64",
);
const uWorldSpawnActor = new NativeFunction(
    base.add(0x2624510),
    "pointer",
    ["pointer", "pointer", "pointer", "pointer"],
    "win64",
);
const uObjectGetWorld = new NativeFunction(
    base.add(0x13075a0),
    "pointer",
    ["pointer"],
    "win64",
);

const uClassGetPrivateStaticClass = new NativeFunction(
    base.add(0x11f02e0),
    "pointer",
    [],
    "win64",
);

const StaticLoadObject = new NativeFunction(
    base.add(0x137b290),
    "pointer",
    [
        "pointer",
        "pointer",
        "pointer",
        "pointer",
        "int32",
        "pointer",
        "int8",
        "pointer",
    ],
    "win64",
);
const StaticFindObject = new NativeFunction(
    base.add(0x137aaa0),
    "pointer",
    ["pointer", "pointer", "pointer", "int8"],
    "win64",
);

const adhSpellManagerCastSpell = new NativeFunction(
    base.add(0xe634a0),
    "pointer",
    ["pointer", "pointer", "pointer"],
    "win64",
);
const adhSpellManagerSetEquippedSpells = new NativeFunction(
    base.add(0xe81f00),
    "pointer",
    ["pointer", "pointer"],
    "win64",
);
const udhGameInstanceGetInstance = new NativeFunction(
    base.add(0xd93240),
    "pointer",
    ["pointer"],
    "win64",
);
const adhSpellManagerSetSpellChargeTier = new NativeFunction(
    base.add(0xe82cf0),
    "void",
    ["pointer", "int8"],
    "win64",
);

const fTransformIdentity = base.add(0x455C4E0);
// const fTransformIdentity = base.add(0x4559220);

function logInfo(Info) {
    // console.log(Info)
}

function findClassByName(ClassName) {
    return findObjectByName(ClassName, uClassGetPrivateStaticClass());
}
function findObjectByName(ObjectName, Clazz) {
    const Buffer = Memory.alloc((ObjectName.length + 1) * 2);
    Buffer.writeUtf16String(ObjectName);
    return StaticFindObject(Clazz, ptr(0xffffffffffffffff), Buffer, 0);
}

function spawnActor(World, Clazz, Position, Owner) {
    const Parameters = Memory.alloc(0x30);
    fActorSpawnParameters(Parameters);
    Parameters.add(0x10).writePointer(Owner);
    return uWorldSpawnActor(World, Clazz, Position, Parameters);
}

function getActorTransform(aActor) {
    const RootComponent = aActor.add(0x130).readPointer();
    if (RootComponent.isNull()) {
        return ptr(0);
    }
    const ComponentToWorld = RootComponent.add(0x1c0);
    return ComponentToWorld;
}
const gWorld = base.add(0x46ed420);
function getGameState() {
    const AuthorityGameMode = gWorld.readPointer().add(0x118).readPointer();
    const GameState = AuthorityGameMode.add(0x280).readPointer();
    return GameState;
}

function castSpell(Caster, SpellName, CastTarget, SpellChargeLevel) {
    const World = uObjectGetWorld(Caster);
    const SpellManagerClass = findClassByName(
        "/Game/Blueprints/Game/Totems/BP_PlayerSpellManager.BP_PlayerSpellManager_C",
    );
    if (SpellManagerClass.isNull()) {
        return false;
    }
    logInfo("SpellManagerClass exists.")
    const SpellManager = spawnActor(
        World,
        SpellManagerClass,
        fTransformIdentity,
        Caster,
    );
    const SpellClass = findClassByName(SpellName);
    if (SpellManager.isNull() || SpellClass.isNull()) {
        return false;
    }
    logInfo("both SpellManager(instance) and SpellClass exists.")

    const GameInstance = udhGameInstanceGetInstance(SpellManager);
    const ThrallSpells = GameInstance.add(0x440);
    adhSpellManagerSetEquippedSpells(SpellManager, ThrallSpells);

    // 理由はわからんけどレベ1で打ちたかったら2渡す 5以上渡すと何も起きない
    adhSpellManagerSetSpellChargeTier(SpellManager, SpellChargeLevel+2);

    logInfo(`${SpellManager.add(0x280).readFloat()} - cooldownMultip...`)
    logInfo(`${SpellManager.add(0x284).readFloat()} - spell charge lv...`)

    return adhSpellManagerCastSpell(SpellManager, SpellClass, CastTarget);
}
/*

[0, '/Game/Blueprints/Game/Totems/TS_Hush.TS_Hush_C'], //沉默
1 Level = 30s
2 Level = 45s
3 Level = 60s

[1, '/Game/Blueprints/Game/Totems/TS_Whiteout.TS_Whiteout_C'] //雾
1 Level = 50s
2 Level = 70s
3 Level = 90s

*/
const adhHumanCharacterAddStartingInventoryAddr = base.add(0xd46f10);

// test
// const onMeleeWeaponHit = base.add(0xf0ad20);
Interceptor.attach(adhHumanCharacterAddStartingInventoryAddr, {
// Interceptor.attach(onMeleeWeaponHit, {
    onEnter: (_args) => {
        const GameState = getGameState();
        const ptrTotemSpell = castSpell(
            GameState,
            "/Game/Blueprints/Game/Totems/TS_Hush.TS_Hush_C",
            ptr(0),
            0,
        );
        logInfo(ptrTotemSpell)
    },
});
