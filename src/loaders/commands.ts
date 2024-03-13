import { readdirSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import { BaseCommand, Client } from '../lib'

export class CommandLoader {
    constructor(private readonly client: Client) {}
    public loadCommands = () => {
        console.log(`${chalk.blueBright('[LOADER]')} - Loading Commands...`)
        const path = [__dirname, '..', 'commands']
        const files = readdirSync(join(...path))
        for (const file of files) {
            const command: BaseCommand = new (require(
                join(...path, file)
            ).default)()
            command.client = this.client
            this.client.commands.set(command.config.name, command)
            console.log(
                `${chalk.blueBright('[LOADER]')} - Loaded ${chalk.green(command.config.name)}`
            )
        }
        console.log(
            `${chalk.blueBright('[LOADER]')} - Successfully loaded ${chalk.cyan(this.client.commands.size.toString())} commands.`
        )
    }
}
