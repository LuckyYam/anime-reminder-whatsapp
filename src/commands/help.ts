import { BaseCommand } from '../lib'
import { Message } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'help',
            description: "Displays the bot's available commands",
            cooldown: 10,
            usage: 'help'
        })
    }

    public override execute = async (M: Message): Promise<void> => {
        let text = `Hello! ${M.sender.username}. Below are the usable commands of the bot.`
        this.client.commands.forEach((cmd) => {
            const { name, cooldown, description, usage } = cmd.config
            let flag = true
            if (['eval', 'block', 'unblock', 'delete'].includes(name))
                flag = this.client.config.owners.includes(M.sender.id)
            if (flag)
                text += `\n\n🔵 *Command:* ${this.client.utils.capitalise(name)}\n⚪ *Description:* ${description}\n⚫ *Usage:* ${usage
                    .split('||')
                    .map((x) => this.client.config.prefix.concat(x.trim()))
                    .join(' | ')}\n⏰ *Cooldown:* ${cooldown || 3}s`
        })
        return void (await M.reply(text))
    }
}
