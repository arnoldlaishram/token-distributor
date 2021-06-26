import { expect } from 'chai'
import "@nomiclabs/hardhat-waffle";

import { waffle, ethers } from "hardhat";
const { deployContract, solidity, provider } = waffle;
import BalanceTree from '../src/balance-tree'
import { Contract, BigNumber } from 'ethers';

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

    describe('#Claim', () => {
        it('fails for empty proof', async () => {
            await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith(
                'TokenDistributor: Invalid proof.'
            )
        })

        it('fails for invalid index', async () => {
            await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith(
                'TokenDistributor: Invalid proof.'
            )
        })

        describe('two account tree', () => {

            let distributor: Contract
            let tree: BalanceTree
            beforeEach('deploy', async () => {
                tree = new BalanceTree([
                { account: wallet0.address, amount: BigNumber.from(100) },
                { account: wallet1.address, amount: BigNumber.from(101) },
                ])
                const TokenDistributor = await ethers.getContractFactory("TokenDistributor");
                distributor = await TokenDistributor.deploy(token.address, tree.getHexRoot(), overrides);
                await token.setBalance(distributor.address, 201)
            })

            it('successful claim. Emits Claimed event', async () => {
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
                    .to.emit(distributor, 'Claimed')
                    .withArgs(0, wallet0.address, 100)

                const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
                await expect(distributor.claim(1, wallet1.address, 101, proof1, overrides))
                    .to.emit(distributor, 'Claimed')
                    .withArgs(1, wallet1.address, 101)
            })

            it('transfers the token', async () => {
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                expect(await token.balanceOf(wallet0.address)).to.eq(0)
                await distributor.claim(0, wallet0.address, 100, proof0, overrides)
                expect(await token.balanceOf(wallet0.address)).to.eq(100)

                const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
                expect(await token.balanceOf(wallet1.address)).to.eq(0)
                await distributor.claim(1, wallet1.address, 101, proof1, overrides)
                expect(await token.balanceOf(wallet1.address)).to.eq(101)
            })

            it('must have enough to transfer', async () => {
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await token.setBalance(distributor.address, 99)
                await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
                    .to.be.revertedWith('ERC20: transfer amount exceeds balance')
            })

            it('must have enough to transfer', async () => {
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await token.setBalance(distributor.address, 99)
                await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
                    .to.be.revertedWith('ERC20: transfer amount exceeds balance')
            })

            it('set #isClaimed', async () => {
                expect(await distributor.isClaimed(0)).to.equal(false)
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await distributor.claim(0, wallet0.address, 100, proof0, overrides)
                expect(await distributor.isClaimed(0)).to.equal(true)
            })

            it('Cannot claim twice', async () => {
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await distributor.claim(0, wallet0.address, 100, proof0, overrides)
                
                await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
                    .to.be.revertedWith('TokenDistributor: Drop already claimed.')
            })


        })
    })

})