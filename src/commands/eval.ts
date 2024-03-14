import { BaseCommand } from '../lib'
import { IParam, Message } from '../types'

export default class extends BaseCommand {
    constructor() {
        super({
            name: 'eval',
            cooldown: 3,
            description: 'Evaluated JavaScript.',
            usage: 'eval [code]'
        })
    }

    public override execute = async (
        M: Message,
        param: IParam
    ): Promise<void> => {
        let out: string
        try {
            const output = eval(param.context)
            out = JSON.stringify(
                output === undefined ? 'Evaluated' : output,
                null,
                4
            )
        } catch (err: any) {
            out = err.message
        }
        await M.reply(out)
    }
}
