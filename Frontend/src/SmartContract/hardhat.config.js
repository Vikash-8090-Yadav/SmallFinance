
require ('@nomiclabs/hardhat-waffle');

task("accounts","Prints the list of the accounts",async (taskArgs , hre )=>{
  const accounts = await hre.ethers.getSigners();

  for(const account of accounts){
    console.log(account.address);
  }
})

module.exports = {
  solidity: "0.8.10",

  defaultNetwork: "Sepolia",
  networks:{
    hardhat:{},
    Sepolia: {
      url: "https://sepolia.drpc.org",
      chainId: 11155111,
      accounts: ['17ded6c5a0811119f4144dbafaca37488d045dc41d520977d020bf449f35b46a'],
    },
  }
};