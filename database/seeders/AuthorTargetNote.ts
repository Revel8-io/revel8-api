import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import authorTargetNotes from '../../authorTargetNotes.json'
import Note from 'App/Models/Note'

export default class extends BaseSeeder {
  public async run() {
    for (const username in authorTargetNotes) {
      Note.create({
        author: 'smilingkylan',
        target: username,
        note: `I totally love ${username}'s content on Twitter!`,
        targetId: 'test',
        relatedTweetUrl: 'test',
        relatedTweetId: 'test'
      })
      Note.create({
        author: 'smilingkylan',
        target: username,
        note: `I really didn't like it when ${username}'s said something bad about my favorite thing!`,
        targetId: 'test',
        relatedTweetUrl: 'test',
        relatedTweetId: 'test'
      })
    }
  }
}
