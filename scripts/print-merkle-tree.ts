
import * as path from 'path'
import { writeToFile } from '../src/util'
import { request, gql } from 'graphql-request';
import {DorgGQLRes} from '../src/model'
import { generateMerkleRoot } from '../scripts/generate-merkle-root';

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