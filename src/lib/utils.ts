import moment from 'moment'
import _moment from 'moment-timezone'
import axios from 'axios'
import { timezone, Parser } from '.'
import { Day } from '../types'

export const getLocalTimezone = (): string =>
    Intl.DateTimeFormat().resolvedOptions().timeZone

//considering it would be aired today
export const getLocalAiringTime = (time: string): string => {
    const now = _moment.tz(timezone).format('YYYY-MM-DD')
    const originalTime = _moment.tz(`${now}T${time}:00`, timezone)
    const result = originalTime
        .clone()
        .tz(getLocalTimezone())
        .format('YYYY-MM-DD-HH-mm')
    return result
}

export const getTimeoutMs = (timestamp: string): number => {
    const x = moment(moment().format('YYYY-MM-DD-HH-mm'), 'YYYY-MM-DD-HH-mm')
    const y = moment(timestamp, 'YYYY-MM-DD-HH-mm')
    return Math.abs(x.diff(y))
}

export const isAhead = (): boolean => {
    const tz_1 = _moment.tz(getLocalTimezone()).format('YYYY-MM-DD HH:mm:ss')
    const tz_2 = _moment.tz(timezone).format('YYYY-MM-DD HH:mm:ss')
    return _moment(tz_2).isAfter(tz_1)
}

export const getToday = (timezone = getLocalTimezone()): Day =>
    _moment.tz(timezone).format('dddd') as Day

export const getPreviousDay = (timezone = getLocalTimezone()): Day =>
    _moment.tz(timezone).clone().subtract(1, 'd').format('dddd') as Day

export const getNextDay = (timezone = getLocalTimezone()): Day =>
    _moment.tz(timezone).clone().add(1, 'd').format('dddd') as Day

export const fetch = async (url: string) => (await axios.get<string>(url)).data

export const cleanArray = (
    data: ReturnType<Parser['getTodayUnairedAnime']>
): ReturnType<Parser['getTodayUnairedAnime']> =>
    data.filter((x, y, z) => z.findIndex((i) => x.title === i.title) === y)

export const getMostSimilar = (
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
        const distance = longer.length - levenshteinDistance(longer, shorter)
        return (distance / longerLength) * 100
    }
    const result: { [K in string]: string } = {}
    title.forEach((y) => {
        let maxSimilarity = -1
        let mostSimilarStr = ''
        title_rom.forEach((x) => {
            const similarity = getPercentage(x, y)
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity
                mostSimilarStr = x
            }
        })
        result[y] = mostSimilarStr
    })
    return result
}
