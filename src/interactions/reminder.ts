import { schedule } from 'node-cron'
import { Client } from '../lib'
import { AnimeLoader } from '../loaders'

export class ReminderInteraction {
    constructor(private readonly client: Client) {}

    public handle = async (): Promise<void> => {
        const task = schedule('0 0 * * *', async () => {
            const loader = new AnimeLoader(this.client)
            await loader.load()
            await this.client.init()
        })
        task.start()
    }
}
