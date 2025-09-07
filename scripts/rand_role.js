// 役職ランダム
const base = Process.getModuleByName(
  "DreadHungerServer-Win64-Shipping.exe"
).base;
function randomNum(max) {
  return Math.floor(Math.random() * max);
}
const roles = [1, 2, 3, 4, 5, 6, 7, 8];

const adhPlayerStateSetPlayerRole = base.add(0xe4f390);
const udhPlayerRoleDataFindByType = new NativeFunction(
  base.add(0xe33300),
  "size_t",
  ["char", "pointer"],
  "win64"
);
const adhPlayerStateSetPlayerRoleInterceptor = Interceptor.attach(
  adhPlayerStateSetPlayerRole,
  {
    onEnter: (args) => {
      const adhPlayerState = args[0];
      const index = randomNum(roles.length);
      const role = roles[index];
      const newUdhPlayerRoleData = udhPlayerRoleDataFindByType(
        role,
        adhPlayerState
      );
      roles.splice(index, 1);
      args[1] = ptr(newUdhPlayerRoleData);
    },
  }
);
