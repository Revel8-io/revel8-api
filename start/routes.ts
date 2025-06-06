/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async () => {
  return { hello: 'world' }
})

// HexValues
Route.get('hex/:hexId/atoms', 'HexesController.getHexAtoms')
Route.get('hex/:hexId/triples', 'HexesController.getHexTriples')
Route.get('hex/top-evm-address-atoms', 'HexesController.getTopEvmAddressAtoms')

// Notes
Route.get('notes/author-target', 'NotesController.getAuthorTargetNotes')
Route.post('notes/store-get', 'NotesController.storeAndGetAuthorTargetNotes')
Route.resource('notes', 'NotesController').apiOnly()

// pinata
Route.post('ipfs/upload', 'IpfsController.create')
Route.post('ipfs/upload-image', 'IpfsController.uploadImage')
Route.get('ipfs/upload-iterator', 'IpfsController.getIterator')
Route.post('ipfs/upload-json', 'IpfsController.uploadJson')

// atoms
Route.get('atoms/relevant/by-full-query', 'AtomsController.getRelevantAtomsByQueryString')
Route.get('atoms/search', 'AtomsController.searchAtomsWithContentsVaults')
Route.get('atoms/most-relevant-x', 'AtomsController.getMostRelevantXAtoms') // old plasmo CreateTriplePopup
Route.get('x/user-atoms', 'AtomsController.getXUserAtom')
Route.get('generate-json-data', 'AtomsController.generateJSONData')
Route.get('search-atoms', 'SearchAtomsController.index')
Route.get('search-atoms/fuzzy', 'SearchAtomsController.fuzzySearchAtomContents')
Route.get('atoms/multiple/:ids', 'AtomsController.showMultiple')
Route.get('atoms-with-contents/:atomIds', 'AtomsController.showWithContents')
Route.get('atoms/:atomId/all', 'AtomsController.getAtomContentsWithVaults') // explorer Atoms page
Route.get('atoms/:atomId/relevant-images', 'AtomsController.getRelevantImages')
Route.get('atoms/relevant/by-query-type', 'AtomsController.getRelevantAtomsByQueryType')

// exchange rates
Route.get('exchange-rates', 'MiscController.getExchangeRates')
Route.get('contract-config', 'MiscController.getContractConfig')

Route.get('triples/atom/:atomId', 'TriplesController.getTriplesByAtomId')
Route.get('triples/rankings/:atoms', 'TriplesController.getTriplesRankingsWithContents')
Route.get('triples/atom/:atomId/relevant', 'TriplesController.getAtomRelevantTriples')
Route.get('triples/vault/:vaultId', 'TriplesController.getTripleByVaultId')
Route.resource('triples', 'TriplesController').apiOnly()

// positions
Route.get('positions/vault/:vaultId', 'PositionsController.getPositionsByVaultId')
Route.get('positions/triple/:tripleId', 'PositionsController.getPositionsByTripleId')
Route.get('positions/atom/:atomId', 'PositionsController.getPositionsByAtomId')
Route.get('positions/triple/:tripleId/account/:accountId', 'PositionsController.getPositionsByTripleIdAndAccountId')
Route.resource('positions', 'PositionsController').apiOnly()

// Signals
Route.get('signals/triple/:tripleId', 'SignalsController.getSignalsByVaultId')

// Browser
Route.get('browser/webpage/info', 'BrowserController.getWebpageInfo')
Route.get('browser/webpage/screenshot', 'BrowserController.getWebpageScreenshot')