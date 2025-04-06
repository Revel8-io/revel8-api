export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
  first_page: number
  first_page_url?: string
  last_page_url: string
  next_page_url: string | null
  previous_page_url: string | null
}

export interface AtomIpfsData {
  id: number
  atom_id: number
  contents: Record<string, any>
  contents_attempts: number
  image_attempts: number
  image_hash: string | null
  image_filename: string | null
  created_at?: string
  updated_at?: string
}

export interface Vault {
  id: number
  totalShares: string // Represents a large number, kept as string
  currentSharePrice: string // Represents a large number, kept as string
  positionCount: number
  atomId?: number
  tripleId?: number
}

export interface Atom {
  id: number
  walletId: string
  creatorId: string
  vaultId: number
  data: Record<string, any>
  type: string
  emoji: string | null
  label: string | null
  image: string | null
  valueId: string | null
  blockNumber: number
  blockTimestamp: string
  transactionHash: string
  atomIpfsData?: AtomIpfsData
  vault?: Vault
}

export interface PaginatedResponse<T> {
  meta: PaginationMeta
  data: T[]
}

// Specific endpoint response types
export interface GetAtomsResponse extends PaginatedResponse<Atom> {}

export interface GetAtomResponse {
  atom: Atom
}

export interface GetMultipleAtomsResponse {
  atoms: Atom[]
}

export interface XAtomResponse {
  subjectId: string
  vaultId: string
  counterVaultId: string
  vaultTotalShares: string
  vaultCurrentSharePrice: string
  vaultAtomId: string
  vaultTripleId: string
  vaultPositionCount: number
  counterVaultTotalShares: string
  counterVaultCurrentSharePrice: string
  counterVaultAtomId: string
  counterVaultTripleId: string
  counterVaultPositionCount: number
  contents: Record<string, any>
  image_filename?: string
}

export interface GetMostRelevantXAtomsResponse {
  rows: XAtomResponse[]
}

export interface XUserAtomResponse {
  contents: Record<string, any>
  totalShares: string
  currentSharePrice: string
  positionCount: number
  blockNumber: number
  blockTimestamp: string
  vaultId: number
  creatorId: string
}

export interface GetXUserAtomResponse {
  rows: XUserAtomResponse[]
}

// Error responses
export interface ApiErrorResponse {
  message: string
  error?: Record<string, any>
}
