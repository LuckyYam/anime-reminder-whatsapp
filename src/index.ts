import { config } from 'dotenv'
import chalk from 'chalk'
import { Client } from './lib'
import {
    CallInteraction,
    MessageInteraction,
    ReminderInteraction
} from './interactions'
import { AnimeLoader, CommandLoader } from './loaders'

config()
;(async () => {
    const client = new Client({
        prefix: process.env.PREFIX || '!',
        owners: (process.env.OWNERS || '')
            .split(', ')
            .filter((x) => x !== '')
            .map((x) => `${x}@s.whatsapp.net`),
        session_dir: process.env.SESSION_DIR || 'auth'
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
    client.once('open', async () => {
        await client.db.prisma
            .$connect()
            .then(() =>
                console.log(
                    `${chalk.cyanBright('[DATABASE]')} - Connected to the database`
                )
            )
        new CommandLoader(client).loadCommands()
        await new AnimeLoader(client).load()
        await client.init()
        await new ReminderInteraction(client).handle()
    })
})()
