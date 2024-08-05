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

// Users
Route.resource('users', 'UsersController').apiOnly()

// Notes
Route.get('notes/author-target', 'NotesController.getAuthorTargetNotes')
Route.resource('notes', 'NotesController').apiOnly()

// Twitter
Route.get('twitter/request-token', 'TwitterController.getRequestToken')
Route.get('twitter/callback', 'TwitterController.twitterCallback')
