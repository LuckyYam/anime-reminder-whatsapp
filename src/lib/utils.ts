import moment from 'moment'
import _moment from 'moment-timezone'
import { IAnimeModel } from '../types'

//considering the anime didn't get any delays
export const getCurrentEp = (data: IAnimeModel): number => {
    const start = moment(data.broadcast_data.start).startOf('d')
    const current = moment(moment().format('YYYY-MM-DD')).startOf('d')
    return current.diff(start, 'w') + 1
}

//considering it would be aired today
export const getLocalAiringTime = (
    time: string,
    from: string,
    to: string
): string => {
    const now = _moment().tz(from).format('YYYY-MM-DD')
    const originalTime = _moment.tz(`${now}T${time}:00`, from)
    const result = originalTime.clone().tz(to).format('YYYY-MM-DD-HH-mm')
    return result
}

export const getTimeoutMs = (from: string, to: string): number => {
    const x = moment(from, 'YYYY-MM-DD-HH-mm')
    const y = moment(to, 'YYYY-MM-DD-HH-mm')
    return Math.abs(x.diff(y))
}
