# backup-bot
This is a little tool that backs up Discord servers. It's pretty basic right now, just downloading the first server the bot is attached to and grabbing
all messages and attachments from all channels it has access to.

## Setup
To use, you need Node 18+ and this compiled binary. You also need to do the following (as of Feb 23):

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new app and name it what you want. Note the client ID for later.
3. Go to the Bot link in the sidebar
4. Create a bot and copy the token
5. Toggle Message Content Intent on
6. In the same directory as the binary, put a file called `config.json` with the following: `{"token":"YOUR TOKEN HERE"}`
7. Invite the bot to your server via a URL like this: `https://discord.com/oauth2/authorize?client_id=CLIENT ID&scope=bot&permissions=1`
8. Run the script via `node backup.js`

All messages are saved in JSON files based off of channel names. Messages are structured as follows:
```
{
	"author": "echo ✨",
	"content": "this is an example message",
	"date": "10/31/22 2:43pm",
	"attachments": [
		"1021100918185410580/PXL_20220918_154529701.jpg"
	]
},
```
The attachments field is a relative path to all attachments for the message. The directory numbers refer to the message UID.

## Dev Setup
1. Clone the repo
2. Run app setup as above
3. Run `yarn` to install dependencies
4. `yarn start` does a backup, `yarn build` creates a build
