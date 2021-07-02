import { expect } from 'chai'
import "@nomiclabs/hardhat-waffle";

import { waffle, ethers } from "hardhat";
const { provider } = waffle;
import BalanceTree from '../src/balance-tree'
import { Contract, BigNumber } from 'ethers';
import { generateMerkleRoot } from '../scripts/generate-merkle-root';
import { Dao } from '../src/model';

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

            it('cannot claim if proof is invalid', async () => {
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await expect(distributor.claim(1, wallet1.address, 101, proof0, overrides)).to.be.revertedWith(
                  'TokenDistributor: Invalid proof.'
                )
            })

            it('cannot claim if index is invalid', async () => {
                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await expect(distributor.claim(10, wallet1.address, 100, proof0, overrides)).to.be.revertedWith(
                  'TokenDistributor: Invalid proof.'
                )
            })

            it('proof verification works', async () => {
                const root = Buffer.from(tree.getHexRoot().slice(2), 'hex')

                const proof0 = tree
                    .getProof(0, wallet0.address, BigNumber.from(100))
                    .map((el) => Buffer.from(el.slice(2), 'hex'))

                expect(BalanceTree.verifyProof(0, wallet0.address, BigNumber.from(100), proof0, root))
                .to.be.true

                const proof1 = tree
                    .getProof(1, wallet1.address, BigNumber.from(101))
                    .map((el) => Buffer.from(el.slice(2), 'hex'))

                expect(BalanceTree.verifyProof(1, wallet1.address, BigNumber.from(101), proof1, root))
                .to.be.true
            })

            it('Can claim if with timeFrame', async () => {
                let _1hr = 3600;
                await ethers.provider.send("evm_increaseTime", [3600])
                await ethers.provider.send("evm_mine", [])

                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
                    .to.emit(distributor, 'Claimed')
                    .withArgs(0, wallet0.address, 100)
            })

            it('Cannot claim if timeframe is elapsed', async () => {
                let _4days = 3600 * 24 * 4;
                await ethers.provider.send("evm_increaseTime", [_4days])
                await ethers.provider.send("evm_mine", [])

                const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
                await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
                  'Cannot claim. You missed it'
                )

            })

        })
    })

    describe('#drain', () => {

        
        beforeEach('deploy with admin access', async () => {
            await token.setBalance(distributor.address, 201)
        })

        it('drains with correct owner. Emits Drained event',  async () => {
            const [account0, account1] = await ethers.getSigners()
            await expect(distributor.drain(account1.address, 201, {from: account0.address, ...overrides }))
            .to.emit(distributor, 'Drained')
            .withArgs(account1.address, 201)
        })

        it('drains to given address',  async () => {
            const [account0, account1] = await ethers.getSigners()
            await distributor.drain(account1.address, 201, {from: account0.address, ...overrides })
            expect(await token.balanceOf(distributor.address)).to.equal(0)
            expect(await token.balanceOf(account1.address)).to.equal(201)
        })

        it('drains fails with incorrect owner.',  async () => {
            const [account0, account1, account2] = await ethers.getSigners()
            await expect(distributor.connect(account1).drain(account2.address, 201, overrides))
            .to.be.revertedWith('Ownable: caller is not the owner')
        })

    })

    describe('#generate-merkle-tree', () => {

        let generatedClaims;
        beforeEach('deploy', async () => {
            const dorgDao : Dao = {
            "avatarContract": {
                "balance": 0,
                "name": "Girard28"
            },
            "name": "Girard28",
            "nativeReputation": {
                "totalSupply": 300000000000000000000
            },
            "reputationHolders": [
                {
                "address": wallet0.address,
                "balance": 100000000000000000000
                },
                {
                "address": wallet1.address,
                "balance": 100000000000000000000
                }
            ]
            }

            const { claims, merkleRoot } = await generateMerkleRoot(100000000000000, dorgDao)
            generatedClaims = claims
            const TokenDistributor = await ethers.getContractFactory("TokenDistributor");
            distributor = await TokenDistributor.deploy(token.address, merkleRoot, overrides);
            await token.setBalance(distributor.address, 100000000000000)
          })

          it('check the proofs is as expected', () => {
            expect(generatedClaims).to.deep.eq([
                {
                    index: 0,
                    address: wallet1.address,
                    amount: "33333333333333",
                    nodeHash: "0xab7b98b9b116f35824d1148773785af9114c80c63a893fe5b0d2e75e3d6f37c5",
                    proof: [
                        "0xca109105ceefe4adb2d97f62b97419f8b9cc737586f17751b2f88bdb1257038c"
                    ],
                },
                {
                    index: 1,
                    address: wallet0.address,
                    amount: "33333333333333",
                    nodeHash: "0xca109105ceefe4adb2d97f62b97419f8b9cc737586f17751b2f88bdb1257038c",
                    proof: [
                        "0xab7b98b9b116f35824d1148773785af9114c80c63a893fe5b0d2e75e3d6f37c5"
                    ]
                }
            ])
          })

    })

})