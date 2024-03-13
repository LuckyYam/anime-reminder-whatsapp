import { load } from 'cheerio'
import { Utils, odd } from '.'
export class Parser {
    public getTodayUnairedAnime = (
        data: string
    ): { title: string; delayed: boolean; ep: number; links: string[] }[] => {
        const { getToday, cleanArray } = new Utils()
        const $ = load(data)
        const today = getToday()
        const isOdd = odd.includes(today as 'Sunday')
        const result: {
            title: string
            delayed: boolean
            ep: number
            links: string[]
        }[] = []
        $(`.timetable-column.expanded.${isOdd ? 'odd' : 'even'}.${today}`)
            .find('.timetable-column-show')
            .each((i, el) => {
                const title = $(el).find('a > h2').text().trim()
                const delayed =
                    $(el).find('a > span.show-delay-bar').text().trim() !== ''
                const ep = Number(
                    $(el)
                        .find('h3 > span.show-episode')
                        .text()
                        .trim()
                        .split('Ep ')[1]
                )
                const links: string[] = []
                $(el)
                    .find('.show-streams > a')
                    .each((j, El) => {
                        const link = $(El).attr('href')
                        if (link) links.push('https:'.concat(link))
                    })
                if (title !== '') result.push({ title, ep, delayed, links })
            })
        return cleanArray(result)
    }
}
