import {DorgGQLRes, Dao} from '../src/model'
import { BigNumber, utils } from 'ethers'
import BalanceTree from '../src/balance-tree'
const BN = require('bignumber.js');
const DecimalBN = BN.BigNumber

const { isAddress, getAddress } = utils

export async function generateMerkleRoot(totalTokenToDistribute: string, dOrgDao: Dao) {

  const { totalSupply } = dOrgDao.nativeReputation

  console.log('totalSupply: ' + totalSupply)

  let totalTokenWithDecimal = new DecimalBN(0)
  let totalTokenWithoutDecimal = new DecimalBN(0)
  const reputationHolders = dOrgDao.reputationHolders.reduce<{ [address: string]: { tokenByRep: BigNumber } }>
    ((addressTORepMap, reputationHolder) => {

      console.log('\n')

      let address = reputationHolder.address
      if (!isAddress(address)) {
        throw new Error(`Found invalid address: ${address}`)
      }
      const parsedAdd = getAddress(address)
      if (addressTORepMap[parsedAdd]) throw new Error(`Duplicate address: ${parsedAdd}`)

      const repHolderBal = new DecimalBN(`${reputationHolder.balance}`)
      console.log('repHolderBal: ' + repHolderBal.toFixed())
      const totalRepSupply = new DecimalBN(`${totalSupply}`)
      console.log('totalRepSupply: ' + totalRepSupply.toFixed())

      let repFraction = repHolderBal.dividedBy(totalRepSupply)
      const repPercent = repFraction.multipliedBy(DecimalBN("100"))

      const wad = new DecimalBN('100000000000000000000000000000000000000000000000000') // 1e50
      const wadRoot = new DecimalBN('10000000000000000000000000') // 1e25

      const repPercentRoot = repPercent.multipliedBy(wad).squareRoot() // Multiple by wad not not lose any decimal
      console.log('repPercentRoot: ' + repPercentRoot.toFixed())
      repFraction = repPercentRoot.dividedBy(new DecimalBN("100"))
      console.log('repFraction: ' + repFraction.toFixed())

      console.log('totalTokenToDistribute: ' + totalTokenToDistribute)
      const tokenToDistribute = new DecimalBN(totalTokenToDistribute)
      let token = tokenToDistribute.multipliedBy(repFraction).dividedBy(wadRoot) // divide by root of wad

      console.log('tokenWithDecimal: ' + token.toFixed())
      totalTokenWithDecimal = totalTokenWithDecimal.plus(token)
      let tokenWithoutDecimal = token.toFixed().split('.')[0] // Remove the decimal, ethers.js BigNumber doesn't support Decimals
      console.log('token: ' + tokenWithoutDecimal)
      totalTokenWithoutDecimal = totalTokenWithoutDecimal.plus(new DecimalBN(tokenWithoutDecimal))
      
      addressTORepMap[reputationHolder.address] = { tokenByRep: BigNumber.from(tokenWithoutDecimal) }

      return addressTORepMap
    }, {})

  console.log('\nTotal Token to distribute ' + totalTokenToDistribute)
  console.log('Total Token with Decimal: ' + totalTokenWithDecimal.toFixed())
  console.log('Total Token without Decimal: ' + totalTokenWithoutDecimal.toFixed())
  console.log('Total Token decimal difference: ' + totalTokenWithDecimal.minus(totalTokenWithoutDecimal).toFixed())

  const sortedAddresses = Object.keys(reputationHolders).sort()

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map((address) => ({ account: address, amount: reputationHolders[address].tokenByRep }))
  )

  // generate claims
  const claims = sortedAddresses.map((address, index) => {
    const { tokenByRep } = reputationHolders[address]
    return {
      index,
      address,
      amount: tokenByRep.toString(),
      nodeHash: tree.getNodeHex(index, address, tokenByRep),
      proof: tree.getProof(index, address, tokenByRep)
    }
  })

  return {
    merkleRoot: tree.getHexRoot(),
    tokenTotal: `${totalTokenToDistribute}`,
    claims
  }

}




