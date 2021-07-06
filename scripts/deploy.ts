
import { ethers } from 'hardhat'

const main = async () => {

  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );

  const MyToken = await ethers.getContractFactory("MyToken");
  const myToken = await MyToken.deploy("Omega", "OMG", 10000000000, deployer.address);

  console.log("MyToken Contract deployed to: ", myToken.address);

  const TokenDistributor = await ethers.getContractFactory("TokenDistributor");
  const merkleRoot = "0x4b6458574d346e1a00ae7c095495488dd9cb7bc4fa384f96245bf5b5706290ab";
  const tokenDistributor = await TokenDistributor.deploy(myToken.address, merkleRoot);
  
  console.log("TokenDistributor Contract deployed to: ", tokenDistributor.address);
}

main();