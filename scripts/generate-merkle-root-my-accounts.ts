import { Dao } from '../src/model'

import "@nomiclabs/hardhat-waffle";

const wallet0 = '0x2c1929EE38950843211d1b22C31Ac18F5b23e0c0'
const wallet1 = '0xd001c8ADAbf28128845f18871CE1346EC078eE92'
import { generateMerkleRoot } from '../scripts/generate-merkle-root';

const tokenSupply = 3000000000000000000;

const dorgDao: Dao = {

    "avatarContract": {
        "balance": 0,
        "name": "Avatar"
    },
    "name": "Avatar",
    "nativeReputation": {
        "totalSupply": tokenSupply
    },
    "reputationHolders": [
        {
            "address": wallet0,
            "balance": 1000000000000000000
        },
        {
            "address": wallet1,
            "balance": 1000000000000000000
        }
    ]
}

async function generateMyAccountRoot() {

    const merkleRoot = await generateMerkleRoot(`${tokenSupply}`, dorgDao)
    console.log(JSON.stringify(merkleRoot, null, 2))

}

generateMyAccountRoot()