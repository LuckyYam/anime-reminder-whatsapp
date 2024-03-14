import { BaseCommand } from '../lib'
import { AnimeLoader } from '../loaders'
import { IParam, Message } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'unregister',
            cooldown: 20,
            description:
                'Registers anime to remind a user about when a new episode airs.',
            usage: 'unregister --id=<mal_id>'
        })
    }

    public override execute = async (
        M: Message,
        { flags }: IParam
    ): Promise<void> => {
        if (!flags.id)
            return void (await M.reply(
                `Provide the id of an ongoing anime (MAL). Example - *${this.client.config.prefix}unregister --id=51180*`
            ))
        const anime = await this.client.db.getAnime(flags.id)
        if (!anime || !anime.registered.includes(M.sender.id))
            return void (await M.reply(
                "🟨 Skipped as you're not registered for this anime id."
            ))
        await this.client.db.pullRegistered(flags.id, M.sender.id)
        await M.reply(
            `🟥 Successfully removed *${anime.titles.title_eng || anime.titles.title_rom}* from the registered list.`
        )
        const mapData = this.client.store.get('today')
        if (
            !mapData ||
            !mapData.length ||
            !this.client.scheduled.includes(anime.titles.title_rom)
        )
            return void null
        const i = mapData.findIndex((x) => x.title === anime.titles.title_rom)
        if (i < 0) return void null
        mapData[i].registered.splice(
            mapData[i].registered.indexOf(M.sender.id),
            1
        )
        if (!mapData[i].registered.length) {
            mapData.splice(i, 1)
            this.client.scheduled.splice(
                this.client.scheduled.indexOf(anime.titles.title_rom),
                1
            )
            const timeoutId = this.client.timer.get(anime.titles.title_rom)
            clearTimeout(timeoutId)
            this.client.timer.delete(anime.titles.title_rom)
        }
        this.client.store.set('today', mapData)
        await new AnimeLoader(this.client).load()
        await this.client.init()
    }
}
