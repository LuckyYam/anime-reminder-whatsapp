import { PrismaClient } from '@prisma/client'
import { IAnime } from '@shineiichijo/marika'
import { IAnimeModel } from '../types'

export class Database {
    get prisma(): PrismaClient {
        return new PrismaClient()
    }

    public getAnime = async (mal_id: number | string) => {
        const anime = await this.prisma.anime.findMany({
            where: { mal_id: `${mal_id}` }
        })
        if (anime && anime.length) return anime[0] as IAnimeModel
        else return null
    }

    public pushRegistered = async (mal_id: string | number, add: string) => {
        const data = await this.getAnime(mal_id)
        if (data)
            await this.prisma.anime.update({
                where: {
                    mal_id: `${mal_id}`
                },
                data: {
                    registered: {
                        push: add
                    }
                }
            })
    }

    public updateBroadcast = async (data: IAnime) => {
        if (data.aired.from && data.broadcast.time !== null)
            await this.prisma.anime.update({
                where: {
                    mal_id: `${data.mal_id}`
                },
                data: {
                    broadcast_data: {
                        set: {
                            timezone: data.broadcast.timezone,
                            day: data.broadcast.day,
                            time: data.broadcast.time,
                            start: data.aired.from.split('T')
                        }
                    }
                }
            })
    }

    public createAnime = async (data: IAnime, add?: string) => {
        const registered: string[] = []
        if (add) registered.push(add)
        for (const key of Object.keys(data.broadcast)) {
            if (!data.broadcast[key]) data.broadcast[key] = 'null'
        }
        await this.prisma.anime.create({
            data: {
                mal_id: data.mal_id,
                registered,
                broadcast_data: {
                    timezone: data.broadcast.timezone,
                    day: data.broadcast.day,
                    time: data.broadcast.time,
                    start:
                        data.broadcast.day !== 'null' && data.aired.from
                            ? data.aired.from.split('T')[0]
                            : 'unknown'
                }
            }
        })
    }
}
