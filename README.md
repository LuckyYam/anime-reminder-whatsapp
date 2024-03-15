# anime-reminder-whatsapp

WhatsApp bot to notify users when a new episode airs of an ongoing anime. It uses [Marika (API wrapper of the unofficial MyAnimeList API, Jikan)](https://npmjs.com/package/@shineiichijo/marika) for retrieving the airing data of the anime and [AnimeSchedule](https://animeschedule.net/) for retrieving the anime scheduled to air for the day (with respect to the local timezone).
![preview](./img/preview.jpg)

## Running Yourself
 
 First of all, make sure you have [Node.js](https://nodejs.org/en/download/) & [pnpm](https://pnpm.io/installation/) installed.

- Clone the project and install the dependencies by running the following commands:
```
git clone https://github.com/LuckyYam/anime-reminder-whatsapp.git
pnpm install
```
- Rename the file `.env.example` to `.env` (or you can just create a new `.env` file) in the root directory of the project and assign the value to the variables ([reference](#configuration)).

- Run the following commands:
```
pnpm prisma generate
pnpm prisma db push
pnpm run build
pnpm start
```
- Finally, scan (from the WhatsApp of your phone) the QR code printed in the logs.

## Configuration

| VARIABLE | REQUIRED | DESCRIPTION | DEFAULT VALUE
| ---------- | ------ |  --------------- | --- |
| DATABASE_URL | TRUE | Your MongoDB connection string | |
| PREFIX | FALSE | Prefix of the bot | ! |
| SESSION_DIR | FALSE | The name of the directory where your WhatsApp's bot session is saved | auth |
| OWNERS | TRUE | WhatsApp ids of the owner(s) with country code without '+' (should be seperated by a comma and a space) | |

## LICENSE 

This project is licensed under the [GNU Affero General Public License v3.0](./LICENSE)