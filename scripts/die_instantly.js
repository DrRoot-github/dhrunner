// ダウン時に即死

const base = Process.getModuleByName('DreadHungerServer-Win64-Shipping.exe').base
const setCurrentHealth = new NativeFunction(
  base.add(0xd6e620), "void", ["pointer", "float"]
)
const ADH_HumanCharacter_TakeDamage = new NativeFunction(
  base.add(0xD73DB0),
  "float",
  ["pointer", "float", "pointer", "pointer", "pointer"])

  Interceptor.attach(ADH_HumanCharacter_TakeDamage, {
  onEnter(args) {
    this.self = args[0]
  },

  onLeave() {
    const incapacitated = this.self.add(0xe10).readU8()
    console.log(incapacitated)
    if (incapacitated) {
      setCurrentHealth(this.self, 0)
    }
  }
})