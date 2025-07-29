const base = Process.getModuleByName('DreadHungerServer-Win64-Shipping.exe').base
const msg = INJECTABLE_MESSAGE ?? 'no message injected.'
console.log(msg)