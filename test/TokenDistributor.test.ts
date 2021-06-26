import { expect } from 'chai'
import "@nomiclabs/hardhat-waffle";

import { waffle, ethers } from "hardhat";
const { deployContract, solidity, provider } = waffle;
import BalanceTree from '../src/balance-tree'
import { Contract } from 'ethers';

import * as Distributor from '../artifacts/contracts/TokenDistributor.sol/TokenDistributor.json'
import * as TestERC20 from '../artifacts/contracts/test/TestERC20.sol/TestERC20.json'

const overrides = {
    gasLimit: 9999999,
}

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('TokenDistributor', () => {

    const wallets = provider.getWallets()
    const [wallet0, wallet1] = wallets

    let token: Contract;
    let distributor: Contract;
    beforeEach('deploy token', async () => {
        const TestERC20 = await ethers.getContractFactory("TestERC20");
        token = await TestERC20.deploy('Token', 'TKN', 0, overrides);

        const TokenDistributor = await ethers.getContractFactory("TokenDistributor");
        distributor = await TokenDistributor.deploy(token.address, ZERO_BYTES32, overrides);
    })

    describe("#TokenDistributor init", () => {
        
        it('returns the token address', async () => {
            expect(await distributor.token()).to.equal(token.address);
        })

        it('returns the zero merkle root', async () => {
            expect(await distributor.merkleRoot()).to.equal(ZERO_BYTES32)
        })
    })

})