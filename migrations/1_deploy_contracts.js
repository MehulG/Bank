const Coin = artifacts.require("Coin");
const Bank = artifacts.require("Bank");


module.exports = function (deployer) {
  deployer.deploy(Coin).then( async() =>{
    await deployer.deploy(Bank, Coin.address, 500000)
  }
  );
};
