import { BaseCommand } from '../lib'
import { Message, IParam } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'block',
            usage: 'block (--id=91xxxxx,62xxxx/mentioning users/replying to a user)',
            cooldown: 10,
            description:
                "Block users from the bot's id to make the bot ignore the user."
        })
    }

    public override execute = async (
        M: Message,
        { flags }: IParam
    ): Promise<void> => {
        let users: string[] = []
        const failed: string[] = []
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
                user !== this.client.cleanId(this.client.sock.user?.id || '') &&
                user !== M.sender.id &&
                !this.client.config.owners.includes(user)
        )
        if (!users.length)
            return void (await M.reply(
                "Provide the users to block by mentioning, replying or including --id=91xxxx (91 is the country code & xxxx is the user's whatsapp id) after the command text (or by doing all of it).\n\n*[You can't block yourself, any of the owners or the bot]*"
            ))
        let skippedText = '🟨 *Skipped:*'
        let failedText = '🟥 *Failed to block:*'
        let blockedText = '🟩 *Blocked:*'
        for (const id of users) {
            if (blocklist.includes(id)) {
                skippedText += `\n*@${id.split('@')[0]}*`
                isSkipped = true
                continue
            }
            try {
                await this.client.sock.updateBlockStatus(id, 'block')
                blockedText += `\n*@${id.split('@')[0]}*`
            } catch {
                failed.push(id)
                failedText += `*${id.split('@')[0]}*`
            }
        }
        const text = blockedText.concat(
            isSkipped
                ? `\n\n${skippedText}\n*[The user(s) were skipped as they were already blocked by the bot]*`
                : '',
            failed.length
                ? `\n\n${failedText}\n*[Make sure the user(s) WhatsApp's id are correct as it failed to block]*`
                : ''
        )
        return void (await M.reply(
            text,
            'text',
            users.filter((user) => !failed.includes(user))
        ))
    }
}
