import { WACallEvent } from '@whiskeysockets/baileys'
import chalk from 'chalk'
import { Client } from '../lib'

export class CallInteraction {
    constructor(private readonly client: Client) {}

    public handle = async (call: WACallEvent): Promise<void> => {
        console.log(
            `${chalk.redBright('[CALL]')} - Call from ${call.from.split('@')[0]}`
        )
        await this.client.sock.rejectCall(call.id, call.from)
        console.log(`${chalk.redBright('[CALL]')} - Call rejected!`)
        if (this.client.config.owner.includes(call.from)) return void null
        await this.client.sock.updateBlockStatus(call.from, 'block')
        console.log(`${chalk.redBright('[CALL]')} - User blocked!`)
    }
}
