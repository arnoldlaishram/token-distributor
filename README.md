# TokenDistributor

SmartContract to allow users to claim token who has valid merkle proof within a timeframe. When the timeframe is elapsed, only owner can drain the unused tokens to a specific address.



## Installation


```
yarn
```



### Merkle tree generation

The Merkle tree is generated for the list of dOrg users who have certain reputations. The amount of token that needs to be generated is calculated based on the amount of reputation(rep) the user holds. Say if the total reputation of dOrg is 10. and if a user has 1 rep. The total token the user can claim is 10%. i,e if total token to distribute is 1000, the user gets 100 tokens.



### Merkle tree generation

Merkle tree is generated from the dOrg users fetched from graph.

```

API - https://api.thegraph.com/subgraphs/name/daostack/v41_11_xdai

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

```

This info is used to generate merkle tree. You can find the code under `scripts/generate-merkle-root.ts`.
To run the script use the below command by passing the amount of token.

```

ts-node scripts/generate-merkle-root.ts <amount of token>

ts-node scripts/generate-merkle-root.ts 3000000000000000000

```

This generates a json file under `output/distribution.json`. Sample `distribution.json` looks like this.

```
{
  "merkleRoot": "0x0441837aae9b82c2fde283340baf7f7a70d08391dee7381eeb1af3b21f613055",
  "tokenTotal": "3000000000000000000",
  "claims": [
    {
      "index": 0,
      "address": "0x2c1929EE38950843211d1b22C31Ac18F5b23e0c0",
      "amount": "999999999999999999",
      "nodeHash": "0x186c3864333edd6383ee640de2d5bacb2a68b6c94dbaf1e394eb782769c1164f",
      "proof": [
        "0xff903af3ea602b05f4b30d4844f289bdf977b66a9f986be89e366c29dcb9aa79"
      ]
    },
    {
      "index": 1,
      "address": "0xd001c8ADAbf28128845f18871CE1346EC078eE92",
      "amount": "999999999999999999",
      "nodeHash": "0xff903af3ea602b05f4b30d4844f289bdf977b66a9f986be89e366c29dcb9aa79",
      "proof": [
        "0x186c3864333edd6383ee640de2d5bacb2a68b6c94dbaf1e394eb782769c1164f"
      ]
    }
  ]
}
```

### Deploy smart contract

```

npx hardhat run scripts/deploy.ts --network ropsten

```

### Testing the smart contract

Demo

[![Testing TokenDistributor using Remix IDE](https://user-images.githubusercontent.com/19688333/124708289-b347c880-df17-11eb-86d6-b993f9401eeb.png)
](https://youtu.be/yi3HGhno9-E)


### Sources

https://github.com/Uniswap/merkle-distributor

