import chalk from 'chalk';
import dayjs from 'dayjs';
import {
	Attachment,
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	TextChannel,
} from 'discord.js';
import {
	createWriteStream,
	constants as fsConstants,
	WriteStream,
	readFileSync,
} from 'fs';
import { access, mkdir } from 'fs/promises';
import { basename, resolve } from 'path';
import * as https from 'https';

// Constants
const BACKUP_DIR_NAME = 'backup';
const dir = resolve('.', BACKUP_DIR_NAME);

type LogFunc = (...input: (string | number)[]) => void;

const error: LogFunc = (...input) =>
	console.log(chalk.bold.red(input.join(' ')));
const warning: LogFunc = (...input) =>
	console.warn(chalk.bold.yellow(input.join(' ')));
const log: LogFunc = (...input) =>
	console.log(chalk.bold.white(input.join(' ')));

let token: string;
try {
	const configData = readFileSync('./config.json', { encoding: 'utf-8' });
	const config = JSON.parse(configData) as { token: string };
	token = config.token;
} catch (err) {
	error(err);
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, startBackup);

client.login(token);

async function makeFolder() {
	try {
		await access(dir, fsConstants.W_OK);
	} catch (err) {
		await mkdir(dir);
	}
}

async function startBackup(client: Client<true>) {
	log('Ready! Logged in as', client.user.tag);
	const guilds = await client.guilds.fetch();
	const baseGuild = guilds.first();
	if (!baseGuild) {
		return exit('No guilds found');
	}

	const guild = await baseGuild.fetch();
	if (!guild.available) {
		return exit('Guild not available!');
	}

	log('Beginning backup...');
	const channels = await guild.channels.fetch();
	log('Found', channels.size, 'channels!');

	await makeFolder(); // Makes the backup folder

	const promises = [];
	for (const channel of channels.values()) {
		if (!channel.viewable) {
			warning(`Cannot view ${channel.name}`);
			continue;
		}
		if (!(channel instanceof TextChannel)) {
			log('Skipping', channel.name, 'as non-text channel');
			continue;
		}
		log(`Backing up ${chalk.magenta(channel.name)}...`);
		promises.push(
			(async () => {
				const stream = createWriteStream(
					resolve(dir, `${channel.name}.json`),
					{
						encoding: 'utf-8',
					}
				);
				stream.write('[\n');
				await saveMessages(channel, channel.lastMessageId, stream);
				stream.write('\n]');
				stream.close();
			})()
		);
	}
	await Promise.all(promises);
	log('Backup complete!');
	exit();
}

interface LogMessage {
	author: string;
	content: string;
	date: string;
	attachments?: string[];
}

async function saveMessages(
	channel: TextChannel,
	lastId: string,
	stream: WriteStream
) {
	const messages = await channel.messages.fetch({
		limit: 100,
		before: lastId,
	});

	for (const message of messages.values()) {
		if (!message.content) {
			continue;
		}
		const date = dayjs(message.createdTimestamp).format('M/D/YY h:mma');
		const logMessage: LogMessage = {
			author: message.author.username,
			content: message.cleanContent,
			date,
		};
		if (message.attachments.size) {
			const fileNames = await downloadAttachments(
				message.attachments,
				resolve(dir, channel.name, message.id)
			);
			logMessage.attachments = fileNames.map(
				(name) => `${message.id}/${name}`
			);
		}
		stream.write(JSON.stringify(logMessage, null, '\t') + ',\n');
	}
	log('Saved', messages.size, 'messages from', chalk.magenta(channel.name));
	if (messages.size === 100) {
		return saveMessages(channel, messages.lastKey(), stream);
	}
}

async function downloadAttachments(
	attachments: Collection<string, Attachment>,
	path: string
): Promise<string[]> {
	if (!attachments.size) {
		return [];
	}
	try {
		await access(path, fsConstants.W_OK);
	} catch (err) {
		await mkdir(path, { recursive: true });
	}
	const promises = [];
	for (const file of attachments.values()) {
		const filePath = resolve(path, basename(file.name));
		promises.push(downloadFile(file.url, filePath));
	}
	return Promise.all(promises);
}

async function downloadFile(url: string, path: string): Promise<string> {
	try {
		await access(path, fsConstants.R_OK);
		return Promise.resolve(basename(path));
	} catch (err) {}
	const stream = createWriteStream(path);
	return new Promise((resolve) => {
		https.get(url, (res) => {
			res.pipe(stream);
			res.on('end', () => {
				stream.close();
				resolve(basename(path));
			});
		});
	});
}

function exit(err?: string) {
	if (err) {
		error(err);
		process.exit(1);
	}
	process.exit();
}
