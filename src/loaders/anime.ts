import chalk from 'chalk'
import { Client } from '../lib'
import { IAnimeStore } from '../types'

export class AnimeLoader {
    constructor(private readonly client: Client) {}

    public load = async (): Promise<void> => {
        let data = await this.client.db.getAll()
        if (!data || !data.length) {
            this.client.store.set('today', [])
            return void null
        }
        console.log(`${chalk.blueBright('[LOADER]')} - Loading anime...`)
        const isAhead = this.client.utils.isAhead()
        const today = this.client.utils.getToday().concat('s')
        const target = (
            isAhead
                ? this.client.utils.getNextDay()
                : this.client.utils.getPreviousDay()
        ).concat('s')
        data = data.filter(
            (x) =>
                x.broadcast_data.day === today ||
                x.broadcast_data.day === target
        )
        const todayAiringData = this.client.parser.getTodayUnairedAnime(
            await this.client.utils.fetch('https://animeschedule.net/')
        )
        const titles = data.map((x) => x.titles.title_rom)
        const obj = this.client.utils.getMostSimilar(
            titles,
            todayAiringData.map((x) => x.title)
        )
        const result: IAnimeStore[] = []
        const keys = Object.keys(obj)
        for (const key of keys) {
            const title_ani = key
            const i = todayAiringData.findIndex((x) => x.title === title_ani)
            const j = data.findIndex((x) => x.titles.title_rom === obj[key])
            result.push({
                title_ani,
                title: obj[key],
                delayed: todayAiringData[i].delayed,
                ep: todayAiringData[i].ep,
                links: todayAiringData[i].links,
                registered: data[j].registered,
                broadcast_data: data[j].broadcast_data
            })
            console.log(
                `${chalk.blueBright('[LOADER]')} - Loaded ${chalk.cyan(title_ani.concat(' | ', obj[key]))} anime.`
            )
        }
        this.client.store.set('today', result)
        console.log(
            `${chalk.blueBright('[LOADER]')} - Successfully loaded ${chalk.green(result.length.toString())} anime.`
        )
    }
}
