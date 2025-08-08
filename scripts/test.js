const configs = {
  msg: "default message",
};

rpc.exports = {
  setValue(key, value) {
    console.log(`set ${key} to ${value}`);
    configs[key] = value;
  },
};

setTimeout(() => console.log(configs.msg), 1000);
