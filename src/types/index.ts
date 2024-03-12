export interface IAnimeModel {
    id: string
    mal_id: string
    broadcast_data: {
        day: string
        timezone: string
        time: string
        start: string
    }
    registered: string[]
}
