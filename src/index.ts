import { config } from 'dotenv'
import { Client } from './lib'
import { CallInteraction, MessageInteraction } from './interactions'
import { CommandLoader } from './loaders'

config()
;(async () => {
    const client = new Client({
        prefix: process.env.PREFIX || '!',
        owner: (process.env.OWNER || '')
            .split(', ')
            .map((x) => `${x}@s.whatsapp.net`)
    })
    await client.connect()
    client.on(
        'new-call',
        async (call) => await new CallInteraction(client).handle(call)
    )
    client.on(
        'new-message',
        async (m) => await new MessageInteraction(client).handle(m)
    )
    client.once('open', () => {
        new CommandLoader(client).loadCommands()
    })
})()
