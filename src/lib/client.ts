import { Boom } from '@hapi/boom'
import NodeCache from 'node-cache'
import makeWASocket, {
    DisconnectReason,
    WACallEvent,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    proto,
    delay
} from '@whiskeysockets/baileys'
import P from 'pino'
import EventEmitter from 'events'
import TypedEventEmitter from 'typed-emitter'
import chalk from 'chalk'
import { readdir, unlink, rmdir } from 'fs-extra'
import { join } from 'path'
import { Anime } from '@shineiichijo/marika'
import { BaseCommand, Database, MAL_LOGO_URL, Parser, Utils } from '.'
import { IAnimeStore, Day } from '../types'

export class Client extends (EventEmitter as new () => TypedEventEmitter<Events>) {
    constructor(
        public config: {
            prefix: string
            owners: string[]
            session_dir: string
        } = {
            prefix: '!',
            owners: [],
            session_dir: 'auth'
        }
    ) {
        super()
    }
    public connect = async () => {
        const { state, saveCreds } = await useMultiFileAuthState(
            this.config.session_dir
        )
        const { version } = await fetchLatestBaileysVersion()
        const sock = makeWASocket({
            printQRInTerminal: true,
            version,
            logger: this.logger,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, this.logger)
            },
            msgRetryCounterCache: this.msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            getMessage: async () => {
                return {
                    conversation: ''
                }
            },
            qrTimeout: 60 * 1000
        })
        sock.ev.process(async (events) => {
            if (events['connection.update']) {
                const update = events['connection.update']
                const { connection, lastDisconnect } = update
                if (update.qr)
                    console.log(
                        `${chalk.blueBright('[QR]')} - Scan the QR code from the terminal to connect your WhatsApp device.`
                    )
                if (connection === 'connecting')
                    console.log(
                        `${chalk.greenBright('[CONNECTION]')} - Connecting to WhatsApp...`
                    )
                if (connection === 'open') {
                    console.log(
                        `${chalk.greenBright('[CONNECTION]')} - Connected to the WhatsApp.`
                    )
                    this.emit('open')
                }
                if (connection === 'close') {
                    if (
                        (lastDisconnect?.error as Boom)?.output?.statusCode !==
                        DisconnectReason.loggedOut
                    )
                        this.connect()
                    else {
                        console.log(
                            `${chalk.greenBright('[CONNECTION]')} - You've been logged out of this session.`
                        )
                        await delay(3000)
                        await this.deleteSession()
                        await this.connect()
                    }
                }
            }
            if (events['creds.update']) await saveCreds()
            if (events.call) this.emit('new-call', events.call[0])
            if (events['messages.upsert'])
                this.emit('new-message', events['messages.upsert'].messages[0])
        })
        this.sock = sock
        return sock
    }

    public init = async (): Promise<void> => {
        const data = this.store.get('today')
        if (!data || !data.length) return void null
        for (const anime of data) {
            const localAiringTime = this.utils.getLocalAiringTime(
                anime.broadcast_data.time
                    .split(':')
                    .map((x) => (x.length < 2 ? `0${x}` : x))
                    .join(':'),
                this.utils.getDayIndex(
                    anime.broadcast_data.day.slice(0, -1) as Day
                ),
                anime.broadcast_data.timezone
            )
            const ms = this.utils.getTimeoutMs(localAiringTime)
            if (ms < 0) continue
            const { getAnimeById } = new Anime()
            const animeData = await getAnimeById(anime.mal_id)
            if (!this.scheduled.includes(anime.title)) {
                this.scheduled.push(anime.title)
                const id = setTimeout(async () => {
                    const mapData = this.store.get('today')
                    this.timer.delete(anime.title)
                    if (!mapData || !mapData.length) return void null
                    const index = mapData.findIndex(
                        (x) => x.title === anime.title
                    )
                    if (index < 0) return void null
                    const isLeft = animeData.episodes > anime.ep
                    const { jpg } = animeData.images
                    const image = await this.utils.getBuffer(
                        jpg.large_image_url ||
                            jpg.image_url ||
                            jpg.small_image_url ||
                            MAL_LOGO_URL
                    )
                    const thumbnail = await this.utils.getBuffer(MAL_LOGO_URL)
                    const jpegThumbnail =
                        process.platform === 'win32'
                            ? image.toString('base64')
                            : undefined
                    for (const id of mapData[index].registered) {
                        if (!mapData[index].delayed) {
                            try {
                                await this.sock.sendMessage(id, {
                                    image,
                                    jpegThumbnail,
                                    caption: `Episode ${anime.ep} of the anime ${animeData.title_english || animeData.title} has just been aired! ${anime.links.length ? `\n\n*External Links:*\n${anime.links.map((link) => `*${link}*`).join('\n\n')}\n\n*Note:* It might take some time for this episode to appear on one of the external links.` : ''}${!isLeft ? '\n\nThis anime will be removed from your registered list of anime as this is probably the last episode of this anime.' : ''}`,
                                    contextInfo: {
                                        externalAdReply: {
                                            title: 'MyAnimeList',
                                            thumbnail,
                                            body:
                                                animeData.title_english ||
                                                animeData.title,
                                            sourceUrl: animeData.url
                                        }
                                    }
                                })
                            } catch {
                                continue
                            }
                        }
                    }
                    if (!isLeft)
                        await this.db.removeAnime(animeData.mal_id.toString())
                }, ms)
                this.timer.set(anime.title, id)
            }
        }
    }

    private deleteSession = async (): Promise<void> => {
        console.log(
            `${chalk.yellowBright('[SESSION]')} - Deleting session ${this.config.session_dir}.`
        )
        const path = [__dirname, '..', '..', this.config.session_dir]
        const files = await readdir(join(...path))
        for (const file of files) await unlink(join(...path, file))
        await rmdir(join(...path))
        console.log(
            `${chalk.yellowBright('[SESSION]')} - Session deleted successfully.`
        )
    }

    public cleanId = (id: string): string =>
        id.includes(':') ? id.split(':')[0].concat('@s.whatsapp.net') : id

    public msgRetryCounterCache = new NodeCache()
    public logger = P({ level: 'silent' }).child({}) as any
    public sock!: ReturnType<typeof makeWASocket>
    public commands = new Map<string, BaseCommand>()
    public cooldown = new Map<string, number>()
    public store = new Map<'today', IAnimeStore[]>()
    public timer = new Map<string, NodeJS.Timeout>()
    public db = new Database()
    public utils = new Utils()
    public parser = new Parser()
    public scheduled: string[] = []
}

type Events = {
    'new-call': (call: WACallEvent) => void
    'new-message': (m: proto.IWebMessageInfo) => void
    open: () => void
}
