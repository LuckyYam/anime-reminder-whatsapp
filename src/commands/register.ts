import { Anime } from '@shineiichijo/marika'
import { BaseCommand } from '../lib'
import { AnimeLoader } from '../loaders'
import { IParam, Message } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'register',
            cooldown: 30,
            description:
                'Registers anime to notify a user/group when a new episode airs.',
            usage: 'register --id=<mal_id> || register --id=<mal_id> --group=true'
        })
    }

    public override execute = async (
        M: Message,
        { flags }: IParam
    ): Promise<void> => {
        if (!flags.id)
            return void (await M.reply(
                `Provide the id of an ongoing anime (MAL). Example - *${this.client.config.prefix}register --id=51180*`
            ))
        const group =
            flags.group && flags.group === 'true' && M.isGroup ? true : false
        const id = group ? M.from : M.sender.id
        const anime = new Anime()
        const data = await anime
            .getAnimeById(flags.id)
            .then((res) => res)
            .catch(() => undefined)
        if (!data)
            return void (await M.reply('Provide a valid anime id (MAL).'))
        if (!data.airing)
            return void (await M.reply('The anime should be ongoing.'))
        if (
            !data.broadcast.day ||
            !data.broadcast.time ||
            !data.broadcast.timezone
        )
            return void (await M.reply(
                '🟥 Failed to add the anime. Try again after few days.'
            ))
        const dbAnime = await this.client.db.getAnime(data.mal_id)
        if (!dbAnime) await this.client.db.createAnime(data, id)
        else {
            if (dbAnime.registered.includes(id))
                return void (await M.reply(
                    `🟨 ${group ? 'This group has' : 'You are'} already registered for *${data.title_english || data.title}*`
                ))
            await this.client.db.pushRegistered(data.mal_id, id)
        }
        await M.reply(
            `🟩 Successfully registered for *${data.title_english || data.title}* ${group ? 'in the group' : ''}`
        )
        await new AnimeLoader(this.client).load()
        await this.client.init()
    }
}
