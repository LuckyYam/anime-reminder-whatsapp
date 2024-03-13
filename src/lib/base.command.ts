import { Client } from '.'
import { ICommandConfig, IParam, Message } from '../types'

export class BaseCommand {
    constructor(public config: ICommandConfig) {}

    public execute = async (
        M: Message,
        param: IParam
    ): Promise<void | never> => {
        throw new Error('Command execution method not implemented')
    }

    public client!: Client
}
