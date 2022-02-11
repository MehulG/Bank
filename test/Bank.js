const {
  time,
  expectRevert
} = require('@openzeppelin/test-helpers');
const BN = web3.utils.toBN;

const Bank = artifacts.require("Bank");
const Coin = artifacts.require("Coin");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Bank", function (accounts) {

  owner = accounts[0];
  let user = accounts[1];
  let user1 = accounts[2];
  let user2 = accounts[3];
  let user3 = accounts[4];

  let BANK, COIN;
  let amount = "10000000000"

  const destributeCoin = async (_user, _amount = amount) => {
    await COIN.transfer(_user, _amount);
  }

  beforeEach('should setup the contract Bank', async () => {
    BANK = await Bank.deployed();
    COIN = await Coin.deployed();
  });

  it("should verify coin address", async () => {
    const coin_address = await BANK.coin();
    assert.equal(coin_address, COIN.address);
  });

  it("should not be able to deposit before reward pool set", async () => {
    await COIN.approve(BANK.address, "1");
    await expectRevert(
      BANK.deposit(amount),
      'RewardPool not set',
    );
  });


  it("should be able to set reward pool", async () => {
    bal = await COIN.balanceOf(owner);
    balToBank = BN("10000");
    await COIN.approve(BANK.address, balToBank);
    await BANK.setRewardPool(balToBank);
    trp0 = await BANK.totalRewardPool(0);
    trp1 = await BANK.totalRewardPool(1);
    trp2 = await BANK.totalRewardPool(2);
    expTRP0 = BN(balToBank).mul(BN("20")).div(BN("100"));
    expTRP1 = BN(balToBank).mul(BN("30")).div(BN("100"));
    expTRP2 = BN(balToBank).mul(BN("50")).div(BN("100"));
    assert.equal(trp0.toString(), expTRP0.toString());
    assert.equal(trp1.toString(), expTRP1.toString());
    assert.equal(trp2.toString(), expTRP2.toString());
    balBANK = await COIN.balanceOf(BANK.address);
    assert.equal(balBANK.toString(), balToBank.toString());
  });

  it("should be able to deposit befote t0 + T", async () => {
    await destributeCoin(user);
    balUsr = await COIN.balanceOf(user);
    await COIN.approve(BANK.address, amount, { from: user });
    await BANK.deposit(amount, { from: user });
    let newBalBANK = await COIN.balanceOf(BANK.address);
    assert.equal((BN(newBalBANK).sub(BN(balBANK))).toString(), balUsr.toString());

    await destributeCoin(user1, amount * 2);
    balUsr = await COIN.balanceOf(user1);
    await COIN.approve(BANK.address, amount * 2, { from: user1 });
    await BANK.deposit(amount * 2, { from: user1 });

    await destributeCoin(user2, amount * 3);
    balUsr = await COIN.balanceOf(user2);
    await COIN.approve(BANK.address, amount * 3, { from: user2 });
    await BANK.deposit(amount * 3, { from: user2 });

    await destributeCoin(user3, amount);
    balUsr = await COIN.balanceOf(user3);
    await COIN.approve(BANK.address, amount, { from: user3 });
    await BANK.deposit(amount, { from: user3 });

  });


  it("should not be able to deposit after t0 + T", async () => {
    time.increase(500000)
    await destributeCoin(user1);
    balUsr = await COIN.balanceOf(user1);
    await COIN.approve(BANK.address, amount, { from: user1 });
    await expectRevert(
      BANK.deposit(amount, { from: user1 }),
      'Deposit time exceed',
    );
  });

  it("should not be able to withdraw before t0 + 2T", async () => {
    await expectRevert(
      BANK.withdraw({ from: user1 }),
      "Can't withdraw yet",
    );
  });

  it("should be able to withdraw after t0 + 2T and check rewards", async () => {
    time.increase(500000);

    balBefore = await COIN.balanceOf(user);
    totalDeposited = await BANK.totalDeposits();
    trp0 = await BANK.totalRewardPool(0);

    await BANK.withdraw({ from: user });

    balAfter = await COIN.balanceOf(user);

    amtTransferred = BN(balAfter).sub(BN(balBefore));
    rewards = BN(amtTransferred).sub(BN(amount));
    expRewards = BN(amount).mul(BN(trp0)).div(BN(totalDeposited))
    assert.equal(rewards.toString(), expRewards.toString());


    //t0 + 3T withdraw by user1
    time.increase(500000);

    balBefore = await COIN.balanceOf(user1);
    totalDeposited = await BANK.totalDeposits();
    trp0 = await BANK.totalRewardPool(0);
    trp1 = await BANK.totalRewardPool(1);

    await BANK.withdraw({ from: user1 });

    balAfter = await COIN.balanceOf(user1);
    amtTransferred = BN(balAfter).sub(BN(balBefore));
    rewards = BN(amtTransferred).sub(BN(amount * 2));
    expRewards = BN(amount * 2).mul(BN(trp0).add(BN(trp1))).div(BN(totalDeposited))
    assert.equal(rewards.toString(), expRewards.toString());


    //t0 + 4T withdraw by user2
    time.increase(500000);

    balBefore = await COIN.balanceOf(user2);
    totalDeposited = await BANK.totalDeposits();
    trp0 = await BANK.totalRewardPool(0);
    trp1 = await BANK.totalRewardPool(1);
    trp2 = await BANK.totalRewardPool(2);

    await BANK.withdraw({ from: user2 });

    balAfter = await COIN.balanceOf(user2);
    amtTransferred = BN(balAfter).sub(BN(balBefore));
    rewards = BN(amtTransferred).sub(BN(amount * 3));
    expRewards = BN(amount * 3).mul(BN(trp0).add(BN(trp1)).add(trp2)).div(BN(totalDeposited))
    assert.equal(rewards.toString(), expRewards.toString());


  });

  it("owner should not be able to withdraw if unclaimed deposits", async () => {
    await expectRevert(
      BANK.withdrawRewardPool(),
      "unclaimed deposits exist",
    );
  });
});
