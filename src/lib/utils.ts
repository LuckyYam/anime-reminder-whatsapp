import moment from 'moment'
import _moment from 'moment-timezone'
import axios from 'axios'
import { timezone, Parser } from '.'
import { Day } from '../types'

export class Utils {
    public getLocalTimezone = (): string =>
        Intl.DateTimeFormat().resolvedOptions().timeZone

    public getLocalAiringTime = (
        time: string,
        day_index: number,
        tz: string = timezone
    ): string => {
        const tz_moment = _moment.tz(tz)
        const date =
            day_index === tz_moment.day()
                ? tz_moment.format('YYYY-MM-DD')
                : tz_moment
                      .clone()
                      [this.isAhead() ? 'add' : 'subtract'](1, 'd')
                      .format('YYYY-MM-DD')
        const originalTime = _moment.tz(`${date}T${time}:00`, tz)
        const result = originalTime
            .clone()
            .tz(this.getLocalTimezone())
            .format('YYYY-MM-DD-HH-mm')
        return result
    }

    public getDayIndex = (day: Day): number =>
        [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ].indexOf(day)

    public getTimeoutMs = (
        timestamp: string,
        from: string = moment().format('YYYY-MM-DD-HH-mm')
    ): number => {
        const x = moment(from, 'YYYY-MM-DD-HH-mm')
        const y = moment(timestamp, 'YYYY-MM-DD-HH-mm')
        const ms = Math.abs(x.diff(y))
        return x.isBefore(y) ? ms : -ms
    }

    public isAhead = (): boolean => {
        const tz_1 = _moment
            .tz(this.getLocalTimezone())
            .format('YYYY-MM-DD HH:mm:ss')
        const tz_2 = _moment.tz(timezone).format('YYYY-MM-DD HH:mm:ss')
        return _moment(tz_2).isAfter(tz_1)
    }

    public getToday = (timezone = this.getLocalTimezone()): Day =>
        _moment.tz(timezone).format('dddd') as Day

    public getPreviousDay = (timezone = this.getLocalTimezone()): Day =>
        _moment.tz(timezone).clone().subtract(1, 'd').format('dddd') as Day

    public getNextDay = (timezone = this.getLocalTimezone()): Day =>
        _moment.tz(timezone).clone().add(1, 'd').format('dddd') as Day

    public cleanArray = (
        data: ReturnType<Parser['getTodayUnairedAnime']>
    ): ReturnType<Parser['getTodayUnairedAnime']> =>
        data.filter((x, y, z) => z.findIndex((i) => x.title === i.title) === y)

    public getMostSimilar = (
        title_rom: string[],
        title: string[]
    ): { [K in string]: string } => {
        const levenshteinDistance = (x: string, y: string): number => {
            const matrix: number[][] = []
            for (let i = 0; i <= y.length; i++) matrix[i] = [i]
            for (let i = 0; i <= x.length; i++) matrix[0][i] = i
            for (let i = 1; i <= y.length; i++) {
                for (let j = 1; j <= x.length; j++) {
                    if (y.charAt(i - 1) === x.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1]
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                        )
                    }
                }
            }
            return matrix[y.length][x.length]
        }
        const getPercentage = (x: string, y: string) => {
            const longer = x.length > y.length ? x : y
            const shorter = x.length > y.length ? y : x
            const longerLength = longer.length
            if (longerLength === 0) return 100
            const distance =
                longer.length - levenshteinDistance(longer, shorter)
            return (distance / longerLength) * 100
        }
        const result: { [K in string]: string } = {}
        title.forEach((y) => {
            let maxSimilarity = 75
            let mostSimilarStr = ''
            title_rom.forEach((x) => {
                const similarity = getPercentage(x, y)
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity
                    mostSimilarStr = x
                }
            })
            if (mostSimilarStr !== '') result[y] = mostSimilarStr
        })
        return result
    }

    public fetch = async (url: string): Promise<string> =>
        (await axios.get<string>(url)).data

    public getBuffer = async (url: string): Promise<Buffer> =>
        (await axios.get<Buffer>(url, { responseType: 'arraybuffer' })).data

    public paginateArray = <T>(
        data: T[],
        limit = 10,
        page = 1
    ): {
        pagination: {
            current_page: number
            total_pages: number
            has_next_page: boolean
        }
        data: T[]
    } => {
        const total_pages = Math.ceil(data.length / limit)
        const start = (page - 1) * limit
        const end = start + limit
        const has_next_page = page < total_pages
        if (total_pages < page)
            return {
                pagination: { total_pages, current_page: page, has_next_page },
                data: []
            }
        const result = data.slice(start, end)
        return {
            pagination: { current_page: page, has_next_page, total_pages },
            data: result
        }
    }

    public capitalise = (content: string): string =>
        content
            .split(' ')
            .map((x) => x.charAt(0).toUpperCase().concat(x.slice(1)))
            .join(' ')
}
