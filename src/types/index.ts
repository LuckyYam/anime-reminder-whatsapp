import { odd, even } from '../lib'
import { MessageInteraction } from '../interactions'

export type Day = (typeof odd)[number] | (typeof even)[number]

export interface IAnimeStore {
    title: string
    delayed: boolean
    registered: string[]
    ep: number
}

export type Message = ReturnType<MessageInteraction['simplify']>

export interface IParam {
    args: string[]
    context: string
    flags: { [K in string]: string }
}

export interface ICommandConfig {
    cooldown?: number
    description: string
    name: string
}
