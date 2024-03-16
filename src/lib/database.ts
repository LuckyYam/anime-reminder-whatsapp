import { PrismaClient } from '@prisma/client'
import { IAnime } from '@shineiichijo/marika'

export class Database {
    constructor() {
        this.prisma = new PrismaClient()
    }

    public getAnime = async (mal_id: number | string) =>
        await this.prisma.anime.findUnique({
            where: { mal_id: `${mal_id}` }
        })

    public getAllRegisteredAnime = async () =>
        await this.prisma.anime.findMany()

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

    public removeAnime = async (mal_id: string): Promise<void> =>
        void (await this.prisma.anime.delete({ where: { mal_id } }))

    public pullRegistered = async (mal_id: string | number, add: string) => {
        const data = await this.getAnime(mal_id)
        if (data) {
            data.registered.splice(data.registered.indexOf(add), 1)
            if (data.registered.length)
                await this.prisma.anime.update({
                    where: {
                        mal_id: `${mal_id}`
                    },
                    data: {
                        registered: {
                            set: data.registered
                        }
                    }
                })
            else await this.removeAnime(mal_id.toString())
        }
    }

    public getAnimeList = async (id: string) =>
        await this.prisma.anime.findMany({ where: { registered: { has: id } } })

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
                            start: data.aired.from.split('T')[0]
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
                mal_id: `${data.mal_id}`,
                registered,
                broadcast_data: {
                    timezone: data.broadcast.timezone,
                    day: data.broadcast.day,
                    time: data.broadcast.time,
                    start:
                        data.broadcast.day !== 'null' && data.aired.from
                            ? data.aired.from.split('T')[0]
                            : 'unknown'
                },
                titles: {
                    title_eng: data.title_english || '',
                    title_rom: data.title
                }
            }
        })
    }

    public prisma!: PrismaClient
}
