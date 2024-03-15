import { Anime } from '@shineiichijo/marika'
import { BaseCommand, MAL_LOGO_URL } from '../lib'
import { Message, IParam } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'list',
            description: "Displays user's list of registered anime.",
            cooldown: 10,
            usage: 'list (--page=2)'
        })
    }

    public override execute = async (
        M: Message,
        { flags }: IParam
    ): Promise<void> => {
        let page = 1
        if (flags.page && typeof Number(flags.page) === 'number')
            page = parseInt(flags.page) < 1 ? 1 : parseInt(flags.page)
        const animeData = await this.client.db.getUserAnimeList(M.sender.id)
        if (!animeData || !animeData.length)
            return void (await M.reply("You've not registered for any anime."))
        const { pagination, data } = this.client.utils.paginateArray(
            animeData,
            10,
            page
        )
        let text = `${M.sender.username}'s registered anime list (${animeData.length} in total)\n\n📗 *Current Page:* ${page}\n📘 *Total Pages:* ${pagination.total_pages}\n`
        for (const anime of data) {
            const i = animeData.findIndex((ani) => ani.mal_id === anime.mal_id)
            text += `\n*#${i + 1}*\n${anime.titles.title_eng || anime.titles.title_rom}\n*[Use ${this.client.config.prefix}unregister --id=${anime.mal_id} to remove this anime from your registered anime list]*\n`
        }
        const malData = await new Anime().getAnimeById(data[0].mal_id)
        const { jpg } = malData.images
        const image = await this.client.utils.getBuffer(
            jpg.large_image_url ||
                jpg.image_url ||
                jpg.small_image_url ||
                MAL_LOGO_URL
        )
        return void (await this.client.sock.sendMessage(
            M.from,
            {
                image,
                caption: text.trimEnd(),
                jpegThumbnail:
                    process.platform === 'win32'
                        ? image.toString('base64')
                        : undefined,
                contextInfo: {
                    externalAdReply: {
                        sourceUrl: malData.url,
                        thumbnail:
                            await this.client.utils.getBuffer(MAL_LOGO_URL),
                        title: 'MyAnimeList',
                        body: malData.title_english || malData.title
                    }
                }
            },
            { quoted: M.message }
        ))
    }
}
