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
import { BaseCommand } from '.'
import { IAnimeStore } from '../types'

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

    public msgRetryCounterCache = new NodeCache()
    public logger = P({ level: 'silent' }).child({}) as any
    public sock!: ReturnType<typeof makeWASocket>
    public commands = new Map<string, BaseCommand>()
    public cooldown = new Map<string, number>()
    public store = new Map<'today', IAnimeStore[]>()
}

type Events = {
    'new-call': (call: WACallEvent) => void
    'new-message': (m: proto.IWebMessageInfo) => void
    open: () => void
}
