import { request, gql } from 'graphql-request';
import {DorgGQLRes, Dao} from '../src/model'
import { BigNumber, utils } from 'ethers'
import BalanceTree from '../src/balance-tree'
import * as path from 'path'
import { writeToFile } from '../src/util'
const { parseUnits, parseEther } = utils


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

export async function generateMerkleRoot(totalTokenToDistribute: number, dOrgDao: Dao) {

  const { totalSupply } = dOrgDao.nativeReputation

  const reputationHolders = dOrgDao.reputationHolders.reduce<{ [address: string]: { tokenByRep: BigNumber } }>
    ((addressTORepMap, reputationHolder) => {

      let address = reputationHolder.address
      if (!isAddress(address)) {
        throw new Error(`Found invalid address: ${address}`)
      }
      const parsedAdd = getAddress(address)
      if (addressTORepMap[parsedAdd]) throw new Error(`Duplicate address: ${parsedAdd}`)

      let repFraction = reputationHolder.balance / totalSupply
      let token = repFraction * totalTokenToDistribute;
      const tokenByRep = BigNumber.from(parseInt(`${token}`))
      addressTORepMap[reputationHolder.address] = { tokenByRep }

      return addressTORepMap
    }, {})

  const sortedAddresses = Object.keys(reputationHolders).sort()

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map((address) => ({ account: address, amount: reputationHolders[address].tokenByRep }))
  )

  // generate claims
  const claims = sortedAddresses.map((address, index) => {
    const { tokenByRep } = reputationHolders[address]
    const amount = tokenByRep.toNumber()
    return {
      index,
      address,
      amount: `${amount}`,
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
  const totalToken = parseInt(process.argv[2])

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




