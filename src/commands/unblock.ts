import { BaseCommand } from '../lib'
import { Message, IParam } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'unblock',
            usage: 'unblock --id=91xxxxx,62xxxx || unblock (by replying or mentioning a user) || unblock --id=91xxx,62xxxx (mention users and reply to a user)',
            cooldown: 10,
            description: "Unblock users from the bot's id."
        })
    }

    public override execute = async (
        M: Message,
        { flags }: IParam
    ): Promise<void> => {
        let users: string[] = []
        let isSkipped = false
        if (M.mentioned.length) users.push(...M.mentioned)
        if (M.quoted && !M.quoted.key.fromMe) users.push(M.quoted.sender.id)
        if (flags.id)
            users.push(
                ...flags.id
                    .split(',')
                    .map((x) => x.split('@')[0].concat('@s.whatsapp.net'))
            )
        const blocklist = await this.client.sock.fetchBlocklist()
        users = users.filter(
            (user) =>
                user !== this.client.cleanId(this.client.sock.user?.id || '')
        )
        if (!users.length)
            return void (await M.reply(
                "Provide the users to unblock by mentioning, replying or including --id=91xxxx (91 is the country code & xxxx is the user's whatsapp id) after the command text (or by doing all of it)."
            ))
        let text = '🟩 *Unblocked:*'
        for (const id of users) {
            if (!blocklist.includes(id)) {
                isSkipped = true
                continue
            }
            await this.client.sock.updateBlockStatus(id, 'block')
            text += `\n*@${id.split('@')[0]}*`
        }
        return void (await M.reply(
            text.concat(
                isSkipped
                    ? '\n*[Some users were ignored as they were not blocked by the bot]*'
                    : ''
            ),
            'text',
            users
        ))
    }
}
