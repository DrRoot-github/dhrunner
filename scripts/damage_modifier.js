const base = Module.findBaseAddress(
  'DreadHungerServer-Win64-Shipping.exe'
);

const configs = {
  Captain: 1,
  Chaplain: 1,
  Cook: 1,
  Doctor: 1,
  Engineer: 1,
  Hunter: 1,
  Marine: 1,
  Navigator: 1,
};

rpc.exports = {
  setValue(key, value) {
    if (value != 1) console.log(`damagemod ${key}=${value}`)
    configs[key] = +value;
  }
};

// D73DB0 ; float __fastcall ADH_HumanCharacter::TakeDamage(
//  ADH_HumanCharacter *this, float Damage,
//  const FDamageEvent *DamageEvent, AController *EventInstigator, 
//  AActor *DamageCauser)
const HumanCharacter_TakeDamage = new NativeFunction(base.add(0xD73DB0),
  "float", ["pointer", "float", "pointer", "pointer", "pointer"]
)

// args/retvalのfloat値を弄る場合はreplaceしないといけない
Interceptor.replace(HumanCharacter_TakeDamage,
  new NativeCallback((self, damage, ev, inst, causer) => {
    const playerState = self.add(0xc40).readPointer()
    const roleString = playerState.add(0x590).readPointer().add(0x48)
    const size = roleString.add(0x8).readInt();
    const role = roleString.readPointer().readUtf16String(size);
    // console.log(role, damage)
    let modified = damage
    if (role in configs) {
      modified *= configs[role]
    }

    return HumanCharacter_TakeDamage(self, modified, ev, inst, causer)
  }, "float", ["pointer", "float", "pointer", "pointer", "pointer"]))
