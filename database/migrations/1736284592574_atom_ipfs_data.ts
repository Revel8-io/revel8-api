import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'atom_ipfs_data'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.bigInteger('atomId').unsigned().unique()
      table.jsonb('contents')
      table.integer('contentsAttempts').defaultTo(1)
      table.integer('imageAttempts').defaultTo(1)
      table.string('imageHash').nullable()
      table.string('imageFilename').nullable()
      table.foreign('atomId').references('Atom.id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('createdAt', { useTz: true })
      table.timestamp('updatedAt', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
