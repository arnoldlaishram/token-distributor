import { Dao } from '../src/model'

import "@nomiclabs/hardhat-waffle";

const wallet0 = '0x2c1929EE38950843211d1b22C31Ac18F5b23e0c0'
const wallet1 = '0xd001c8ADAbf28128845f18871CE1346EC078eE92'
import { generateMerkleRoot } from '../scripts/generate-merkle-root';

const dorgDao: Dao = {

    "avatarContract": {
        "balance": 0,
        "name": "Avatar"
    },
    "name": "Avatar",
    "nativeReputation": {
        "totalSupply": 100
    },
    "reputationHolders": [
        {
            "address": wallet0,
            "balance": 49
        },
        {
            "address": wallet1,
            "balance": 16
        }
    ]
}

async function generateMyAccountRoot() {

    const merkleRoot = await generateMerkleRoot("10000000000000000000000", dorgDao)
    console.log(JSON.stringify(merkleRoot, null, 2))

}

generateMyAccountRoot()