import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'atom_ipfs_data'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('atom_id').unsigned().unique()
      table.jsonb('contents')
      table.integer('contents_attempts').defaultTo(1)
      table.integer('image_attempts').defaultTo(1)
      table.string('image_hash').nullable()
      table.string('image_filename').nullable()
      table.foreign('atom_id').references('Atom.id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
