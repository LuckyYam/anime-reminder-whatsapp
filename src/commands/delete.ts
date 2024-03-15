import { BaseCommand } from '../lib'
import { Message } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'delete',
            description:
                "Deletes the quoted./replied message (only applicable to bot's messages)",
            cooldown: 10,
            usage: 'delete (by quoting/replying the message to be deleted)'
        })
    }

    public override execute = async (M: Message): Promise<void> => {
        if (!M.quoted || !M.quoted.key.fromMe)
            return void (await M.reply(
                "Quote/reply to the message you want to be deleted (only applicable to the bot's messages)"
            ))
        try {
            await this.client.sock.sendMessage(M.from, { delete: M.quoted.key })
        } catch {
            await M.reply(
                'Something went wrong while trying to delete the message.'
            )
        }
    }
}
