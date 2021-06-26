type ReputationHolder = {
  balance: number,
  address: string
}

type AvatarContract = {
  name: string,
  balance: number
}

type NativeReputation = {
  totalSupply: number
}


type Dao = {
  name: string,
  nativeReputation: NativeReputation,
  avatarContract: AvatarContract,
  reputationHolders: Array<ReputationHolder>
}

type DorgGQLRes = {
  dao: Dao
}

export default DorgGQLRes