import { Boom } from '@hapi/boom'
import NodeCache from 'node-cache'
import makeWASocket, {
    DisconnectReason,
    WACallEvent,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    proto
} from '@whiskeysockets/baileys'
import P from 'pino'
import EventEmitter from 'events'
import TypedEventEmitter from 'typed-emitter'
import chalk from 'chalk'
import { BaseCommand, Database, Parser, Utils } from '.'
import { IAnimeStore } from '../types'
import { Anime } from '@shineiichijo/marika'

export class Client extends (EventEmitter as new () => TypedEventEmitter<Events>) {
    constructor(
        public config: { prefix: string; owner: string[] } = {
            prefix: '!',
            owner: []
        }
    ) {
        super()
    }
    public connect = async () => {
        const { state, saveCreds } = await useMultiFileAuthState('auth')
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
                            `${chalk.greenBright('[CONNECTION]')} - You've been logged out of this session. Delete the "auth" directory and re-run to connect again.`
                        )
                        process.exit()
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
                anime.broadcast_data.timezone
            )
            const ms = this.utils.getTimeoutMs(localAiringTime)
            if (ms < 0) continue
            const { getAnimeSearch } = new Anime()
            const { data } = await getAnimeSearch({ q: anime.title })
            const animeData = data[0]
            const getImage = () => {
                if (animeData.images.jpg.large_image_url)
                    return animeData.images.jpg.large_image_url
                if (animeData.images.jpg.image_url)
                    return animeData.images.jpg.image_url
                return animeData.images.jpg.small_image_url || ''
            }
            if (!this.scheduled.includes(anime.title)) {
                this.scheduled.push(anime.title)
                setTimeout(async () => {
                    for (const id of anime.registered) {
                        if (!anime.delayed) {
                            const image = await this.utils.getBuffer(getImage())
                            await this.sock.sendMessage(id, {
                                image,
                                jpegThumbnail: image.toString('base64'),
                                caption: `Episode ${anime.ep} of the anime ${animeData.title_english || animeData.title} has just been aired. ${anime.links.length ? `\n\n*External Links:*\n${anime.links.join('\n')}\n\n*Note:* It might take some time for this episode to appear on one of the external links.` : ''}`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: 'MyAnimeList',
                                        thumbnail: await this.utils.getBuffer(
                                            'https://upload.wikimedia.org/wikipedia/commons/7/7a/MyAnimeList_Logo.png'
                                        ),
                                        mediaType: 1,
                                        body:
                                            animeData.title_english ||
                                            animeData.title,
                                        sourceUrl: animeData.url
                                    }
                                }
                            })
                        }
                    }
                }, ms)
            }
        }
    }

    public msgRetryCounterCache = new NodeCache()
    public logger = P({ level: 'silent' }).child({}) as any
    public sock!: ReturnType<typeof makeWASocket>
    public commands = new Map<string, BaseCommand>()
    public cooldown = new Map<string, number>()
    public store = new Map<'today', IAnimeStore[]>()
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
