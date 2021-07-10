import { request, gql } from 'graphql-request';
import {DorgGQLRes, Dao} from '../src/model'
import { BigNumber, utils } from 'ethers'
import BalanceTree from '../src/balance-tree'
import * as path from 'path'
import { writeToFile } from '../src/util'
import { formatEther, parseEther } from 'ethers/lib/utils';
const BN = require('bignumber.js');
const DecimalBN = BN.BigNumber

const { isAddress, getAddress } = utils

const API_URL = "https://api.thegraph.com/subgraphs/name/daostack/v41_11_xdai"

const xdaiQuery = gql`
    {
        dao(id: "0x94a587478c83491b13291265581cb983e7feb540") {
            name
            nativeReputation {
                totalSupply
            }
            avatarContract {
                name
                balance
            }
            reputationHolders {
                balance
                address
            }
        }
    }
`


const fetchDOrgDaoReps = (endpoint: string, query: string, variables = {}) => new Promise<DorgGQLRes | any>((resolve, reject) => {
  request(endpoint, query, variables)
    .then((data) => resolve(data))
    .catch(err => reject(err));
});

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

async function printMerkleTree() {
  const totalToken = process.argv[2]

  if(!totalToken) {
    console.log('No Token passed. Aborted')
    return
  }

  let dOrgGQLRes: DorgGQLRes = await fetchDOrgDaoReps(API_URL, xdaiQuery).catch(error => {
    console.error(error)
    return null;
  });

  if (!dOrgGQLRes) {
    console.error(`Merkle root generation aborted. Fetch API call failed`)
    return
  }

  const merkleTree = await generateMerkleRoot(totalToken, dOrgGQLRes.dao);
  let outputPath = path.join(__dirname, '..', 'output/distribution.json')

  console.log('\n Writing Merkle tree...')
  await writeToFile(outputPath, JSON.stringify(merkleTree, null, 2)).catch(console.error)

}

printMerkleTree()




