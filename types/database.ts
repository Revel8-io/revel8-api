// Types generated from database schema introspection

export interface Account {
  id: string;
  atomId: string | null; // numeric
  label: string;
  image: string | null;
  type: string;
}

export interface Atom {
  id: string; // numeric
  walletId: string;
  creatorId: string;
  vaultId: string; // numeric
  data: string;
  type: string;
  emoji: string | null;
  label: string | null;
  image: string | null;
  valueId: string | null; // numeric
  blockNumber: string; // numeric
  blockTimestamp: string; // numeric
  transactionHash: string; // bytea
}

export interface AtomValue {
  id: string; // numeric
  atomId: string; // numeric
  accountId: string | null;
  thingId: string | null; // numeric
  personId: string | null; // numeric
  organizationId: string | null; // numeric
  bookId: string | null; // numeric
}

export interface Book {
  id: string; // numeric
  atomId: string; // numeric
  name: string | null;
  description: string | null;
  genre: string | null;
  url: string | null;
}

export interface ChainlinkPrice {
  id: string; // numeric
  usd: number; // double precision
}

export interface Claim {
  id: string;
  accountId: string;
  tripleId: string; // numeric
  subjectId: string; // numeric
  predicateId: string; // numeric
  objectId: string; // numeric
  shares: string; // numeric
  counterShares: string; // numeric
  vaultId: string; // numeric
  counterVaultId: string; // numeric
}

export interface Deposit {
  id: string;
  senderId: string;
  receiverId: string;
  receiverTotalSharesInVault: string; // numeric
  senderAssetsAfterTotalFees: string; // numeric
  sharesForReceiver: string; // numeric
  entryFee: string; // numeric
  vaultId: string; // numeric
  isTriple: number; // integer
  isAtomWallet: number; // integer
  blockNumber: string; // numeric
  blockTimestamp: string; // numeric
  transactionHash: string; // bytea
}

export interface Event {
  id: string;
  type: string;
  atomId: string | null; // numeric
  tripleId: string | null; // numeric
  feeTransferId: string | null;
  depositId: string | null;
  redemptionId: string | null;
  blockNumber: string; // numeric
  blockTimestamp: string; // numeric
  transactionHash: string; // bytea
}

export interface FeeTransfer {
  id: string;
  senderId: string;
  receiverId: string;
  amount: string; // numeric
  blockNumber: string; // numeric
  blockTimestamp: string; // numeric
  transactionHash: string; // bytea
}

export interface Organization {
  id: string; // numeric
  atomId: string; // numeric
  name: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
  email: string | null;
}

export interface Person {
  id: string; // numeric
  atomId: string; // numeric
  identifier: string | null;
  name: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
  email: string | null;
}

export interface Position {
  id: string;
  accountId: string;
  vaultId: string; // numeric
  shares: string; // numeric
}

export interface PredicateObject {
  id: string;
  predicateId: string; // numeric
  objectId: string; // numeric
  tripleCount: number; // integer
  claimCount: number; // integer
}

export interface Redemption {
  id: string;
  senderId: string;
  receiverId: string;
  senderTotalSharesInVault: string; // numeric
  assetsForReceiver: string; // numeric
  sharesRedeemedBySender: string; // numeric
  exitFee: string; // numeric
  vaultId: string; // numeric
  blockNumber: string; // numeric
  blockTimestamp: string; // numeric
  transactionHash: string; // bytea
}

export interface Signal {
  id: string;
  delta: string; // numeric
  relativeStrength: string; // numeric
  accountId: string;
  atomId: string | null; // numeric
  tripleId: string | null; // numeric
  depositId: string | null;
  redemptionId: string | null;
  blockNumber: string; // numeric
  blockTimestamp: string; // numeric
  transactionHash: string; // bytea
}

export interface Stats {
  id: number; // integer
  totalAccounts: number; // integer
  totalAtoms: number; // integer
  totalTriples: number; // integer
  totalPositions: number; // integer
  totalSignals: number; // integer
  totalFees: string; // numeric
  contractBalance: string; // numeric
}

export interface StatsHour {
  id: number; // integer
  totalAccounts: number; // integer
  totalAtoms: number; // integer
  totalTriples: number; // integer
  totalPositions: number; // integer
  totalSignals: number; // integer
  totalFees: string; // numeric
  contractBalance: string; // numeric
}

export interface Thing {
  id: string; // numeric
  atomId: string; // numeric
  name: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
}

export interface Triple {
  id: string; // numeric
  creatorId: string;
  subjectId: string; // numeric
  predicateId: string; // numeric
  objectId: string; // numeric
  label: string | null;
  vaultId: string; // numeric
  counterVaultId: string; // numeric
  blockNumber: string; // numeric
  blockTimestamp: string; // numeric
  transactionHash: string; // bytea
}

export interface Vault {
  id: string; // numeric
  atomId: string | null; // numeric
  tripleId: string | null; // numeric
  totalShares: string; // numeric
  currentSharePrice: string; // numeric
  positionCount: number; // integer
}

export interface AdonisSchema {
  id: number; // integer
  name: string; // character varying
  batch: number; // integer
  migration_time: Date | null; // timestamp with time zone
}

export interface AdonisSchemaVersion {
  version: number; // integer
}

export interface AtomIpfsData {
  id: number; // integer
  atom_id: string | null; // bigint
  contents: any | null; // jsonb
  contents_attempts: number | null; // integer
  image_attempts: number | null; // integer
  image_hash: string | null; // character varying
  image_filename: string | null; // character varying
  created_at: Date | null; // timestamp with time zone
  updated_at: Date | null; // timestamp with time zone
}

export interface Note {
  id: number; // integer
  author: string | null; // character varying
  target: string | null; // character varying
  note: string | null; // character varying
  target_id: string | null; // character varying
  related_tweet_url: string | null; // character varying
  related_tweet_id: string | null; // character varying
  created_at: Date | null; // timestamp with time zone
  updated_at: Date | null; // timestamp with time zone
}

export interface Target {
  id: number; // integer
  username: string | null; // character varying
  display_name: string | null; // character varying
  image_url: string | null; // character varying
  url: string | null; // character varying
  created_at: Date | null; // timestamp with time zone
  updated_at: Date | null; // timestamp with time zone
}

export interface User {
  id: string | null; // character varying
  username: string | null; // character varying
  created_at: Date | null; // timestamp with time zone
  updated_at: Date | null; // timestamp with time zone
}

export interface XUser {
  id: number; // integer
  x_user_id: string | null; // character varying
  x_username: string | null; // character varying
  x_name: string | null; // character varying
  x_profile_image_url: string | null; // character varying
  x_description: string | null; // character varying
  x_user_created_at: string | null; // character varying
  created_at: Date | null; // timestamp with time zone
  updated_at: Date | null; // timestamp with time zone
}
