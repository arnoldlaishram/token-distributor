import { request, gql } from 'graphql-request';
import DorgGQLRes from '../src/model'
import { BigNumber, utils } from 'ethers'
import BalanceTree from '../src/balance-tree'

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

async function generateMerkleRoot(totalTokenToDistribute: number) {
  let res: DorgGQLRes = await fetchDOrgDaoReps(API_URL, xdaiQuery).catch(error => {
    console.error(error)
    return null;
  });

  if (!res) {
    console.error(`Merkle root generation aborted. Fetch API call failed`)
    return
  }

  const { totalSupply } = res.dao.nativeReputation

  const reputationHolders = res.dao.reputationHolders.reduce<{ [address: string]: { tokenByRep: BigNumber } }>
    ((addressTORepMap, reputationHolder) => {

      let address = reputationHolder.address
      if (!isAddress(address)) {
        throw new Error(`Found invalid address: ${address}`)
      }
      const parsedAdd = getAddress(address)
      if (addressTORepMap[parsedAdd]) throw new Error(`Duplicate address: ${parsedAdd}`)

      let repFraction = reputationHolder.balance / totalSupply
      let token = repFraction * totalTokenToDistribute;
      addressTORepMap[reputationHolder.address] = {
        tokenByRep: BigNumber.from(token * 10 ^ 18)
      }

      return addressTORepMap
    }, {})

  const sortedAddresses = Object.keys(reputationHolders).sort()

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map((address) => ({ account: address, amount: reputationHolders[address].tokenByRep }))
  )

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: { amount: string; index: number; proof: string[] }
  }>((addressMap, address, index) => {
    const { tokenByRep } = reputationHolders[address]
    addressMap[address] = {
      index,
      amount: tokenByRep.toHexString(),
      proof: tree.getProof(index, address, tokenByRep),
    }
    return addressMap
  }, {})

  return {
    merkleRoot: tree.getHexRoot(),
    claims
  }

}

async function printMerkleTree() {
  const totalToken = parseInt(process.argv[2])

  if(!totalToken) {
    console.log('No Token passed. Aborted')
    return
  }

  const merkleTree = await generateMerkleRoot(totalToken);
  console.log(JSON.stringify(merkleTree))
}

printMerkleTree()




