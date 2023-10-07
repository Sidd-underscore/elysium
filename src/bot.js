const { Client, Collection, ChannelType, MessageType, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials } = require('discord.js');
const { readdirSync, writeFileSync } = require('node:fs');
const { default: axios } = require('axios');
const logger = require('./modules/logger');
const { localize } = require('./modules/localization');
const { ownerId, developerIds, defaultPersonality } = require('../config');
const { QuickDB } = require('quick.db');
const { randomNumber } = require('@tolga1452/toolbox.js');
const { request, RequestMethod } = require("fetchu.js");
const timer = require('./modules/timer');
const EmbedMaker = require('./modules/embed');
const express = require('express');
const { execSync } = require('node:child_process');
const { IpFilter } = require('express-ipfilter');
const sharp = require('sharp');

const client = new Client({
    intents: [
        'Guilds',
        'GuildMessages',
        'MessageContent',
        'DirectMessages',
        'GuildMessageTyping',
        'DirectMessageTyping'
    ],
    partials: [
        Partials.Channel
    ]
});
const db = new QuickDB();
const app = express();

app.use(express.json());

client.commands = new Collection();

const commandFiles = readdirSync('src/commands').filter(file => file.endsWith('.js'));

if (commandFiles.length > 0) logger('info', 'COMMAND', 'Found', commandFiles.length.toString(), 'commands');
else logger('warning', 'COMMAND', 'No commands found');

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    client.commands.set(command.data.name, command);

    logger('success', 'COMMAND', 'Loaded command', command.data.name);
};

async function checkFirstDayOfMonth() {
    let today = new Date();

    if (today.getDate() === 1) {
        let users = await db.get('users');

        for (let user of Object.keys(users)) {
            let userFound = await client.user.fetch(user).catch(() => null);

            if (!userFound) {
                await db.delete(`users.${user}`);

                client.channels.cache.get('1089842190840246342').send(`User **${user}** was removed from the database because they no longer exist.`).catch(() => null);
            };
        };

        let servers = await db.get('guilds');

        for (let server of Object.keys(servers)) {
            let serverFound = await client.guilds.fetch(server).catch(() => null);

            if (!serverFound) {
                await db.delete(`guilds.${server}`);

                client.channels.cache.get('1089842190840246342').send(`Server **${server}** was removed from the database because it no longer exists.`).catch(() => null);
            };
        };
    };
};

client.on('ready', async () => {
    logger('info', 'BOT', 'Logged in as', client.user.tag);
    logger('info', 'COMMAND', 'Registering commands');

    axios.put(`https://discord.com/api/v10/applications/${client.user.id}/commands`, client.commands.map(command => command.data.toJSON()), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
        }
    }).then(() => logger('success', 'COMMAND', 'Registered commands')).catch(error => logger('error', 'COMMAND', 'Error while registering commands', `${error.response.status} ${error.response.statusText}\n`, JSON.stringify(error.response.data, null, 4)));

    let deniedIps = await axios.get('https://raw.githubusercontent.com/X4BNet/lists_vpn/main/ipv4.txt');

    deniedIps = deniedIps.data.split('\n');

    app.use(IpFilter(deniedIps));
    app.listen(3200, () => console.log('Listening on port 3200'));

    /*
    let users = await db.get('users') ?? {};

    await db.delete('verified');

    for (let user of Object.keys(users)) {
        await db.delete(`users.${user}.verified`);
    };
    */

    //await db.set('trainMessages', []);

    checkFirstDayOfMonth();
});

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'chat-personality') {
            let user = await db.get(`users.${interaction.user.id}`) ?? {
                personalities: {},
                personality: 'elysium'
            };

            if (!user.personalities) user.personalities = {};
            if (!user.personality) user.personality = 'elysium';

            let personalities = Object.keys(user.personalities);

            return interaction.respond([
                {
                    name: `Elysium (Default)${user.personality === 'elysium' ? ' [Selected]' : ''}`,
                    nameLocalizations: {
                        tr: `Elysium (Varsayılan)${user.personality === 'elysium' ? ' [Seçili]' : ''}`
                    },
                    value: 'elysium'
                },
                ...personalities.map(personality => ({
                    name: `${user.personalities[personality].name}${user.personality === personality ? ' [Selected]' : ''}`,
                    nameLocalizations: {
                        tr: `${user.personalities[personality].name}${user.personality === personality ? ' [Seçili]' : ''}`
                    },
                    value: personality
                }))
            ]);
        };
    } else if (interaction.isCommand() || interaction.isContextMenuCommand()) {
        logger('debug', 'COMMAND', 'Received command', `${interaction.commandName} (${interaction.commandId})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger('warning', 'COMMAND', 'Command ', interaction.commandName, 'not found');

            return interaction.reply({
                content: localize(interaction.locale, 'NOT_FOUND', 'Command'),
                ephemeral: true
            });
        };
        if (command.category === 'Owner' && interaction.user.id !== ownerId) {
            logger('debug', 'COMMAND', 'Command', interaction.commandName, 'blocked for', interaction.user.tag, 'because it is owner only');

            if (!(await db.has(`users.${interaction.user.id}.dismissed`))) {
                await db.set(`users.${interaction.user.id}.dismissed`, true);

                return interaction.reply(localize(interaction.locale, 'OWNERS_NOTE'));
            };

            return interaction.reply({
                content: localize(interaction.locale, 'OWNER_ONLY'),
                ephemeral: true
            });
        };
        if (command.category === 'Developer' && !developerIds.includes(interaction.user.id)) {
            logger('debug', 'COMMAND', 'Command', interaction.commandName, 'blocked for', interaction.user.tag, 'because it is developer only');

            return interaction.reply({
                content: localize(interaction.locale, 'DEVELOPER_ONLY'),
                ephemeral: true
            });
        };

        let user = await db.get(`users.${interaction.user.id}`) ?? {
            usage: 0,
            tier: 0,
            bonus: 0
        };

        if (!user.bonus) user.bonus = 0;
        if (!user.tier) user.tier = 0;
        if (['ask', 'draw-image', 'explain-image', 'server-wizard', 'speak', 'summarize-page'].includes(interaction.commandName)) {
            if (user.bonus > 0) {
                user.bonus--;

                await db.set(`users.${interaction.user.id}.bonus`, user.bonus);
            } else if (user.tier === 0 && user.usage > 50) return interaction.reply({
                content: localize(interaction.locale, 'LIMIT_REACHED', 50),
                ephemeral: true
            });
            else if (user.tier === 1 && user.usage > 100) return interaction.reply({
                content: localize(interaction.locale, 'LIMIT_REACHED', 100),
                ephemeral: true
            });
            else if (user.tier === 2 && user.usage > 250) return interaction.reply({
                content: localize(interaction.locale, 'LIMIT_REACHED', 250),
                ephemeral: true
            });
            else if (user.tier === 3 && user.usage > 500) return interaction.reply({
                content: localize(interaction.locale, 'LIMIT_REACHED', 500),
                ephemeral: true
            });
            else {
                user.usage++;

                await db.set(`users.${interaction.user.id}.usage`, user.usage);
            };
        };
        if (['summarize-page'].includes(interaction.commandName) && user.tier !== 3) return interaction.reply({
            content: localize(interaction.locale, 'EARLY_ACCESS'),
            ephemeral: true
        });

        try {
            await command.execute(interaction);
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing command:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'command', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'command', error.message)
            }));
        };
    } else if (interaction.isMessageComponent()) {
        logger('debug', 'COMMAND', 'Received message component', `${interaction.customId} (${interaction.componentType})`, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        let [id, ...args] = interaction.customId.split(':');

        try {
            switch (id) {
                case 'functions':
                    await interaction.deferReply({ ephemeral: true });

                    let functions = await db.get(`functions.${args[0]}`);

                    if (!functions) return interaction.editReply({
                        content: localize(interaction.locale, 'FUNCTIONS_DELETED'),
                        ephemeral: true
                    });

                    interaction.editReply({
                        embeds: [
                            new EmbedMaker(client)
                                .setTitle(localize(interaction.locale, 'USED_FUNCTIONS'))
                                .setFields(...functions.map(func => ({
                                    name: `\`${func.name}\``,
                                    value: `- **Parameters:** ${JSON.stringify(func.parameters)}\n- **Response:** ${func.response.length > 200 ? func.response.slice(0, 200) + '...' : func.response}`
                                })))
                        ]
                    });
            };
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing message component:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'message component', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'message component', error.message)
            }));
        }
    } else if (interaction.isModalSubmit()) {
        logger('debug', 'COMMAND', 'Received modal submit', interaction.customId, 'from', interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DMs', 'by', `${interaction.user.tag} (${interaction.user.id})`);

        try {
        } catch (error) {
            logger('error', 'COMMAND', 'Error while executing modal:', `${error.message}\n`, error.stack);

            return interaction.reply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'modal', error.message),
                ephemeral: true
            }).catch(() => interaction.editReply({
                content: localize(interaction.locale, 'COMMAND_ERROR', 'modal', error.message)
            }));
        };
    };
})
    .on('messageCreate', async message => {
        try {
            if (message.author.bot) return;
            if (message.channel.type === ChannelType.GuildAnnouncement) return;
            if (message.guild) {
                let guild = await db.get(`guilds.${message.guild.id}`) ?? {};

                let possibility = randomNumber(0, 100);
                let isThreadEligible = false;

                if (message.channel.isThread()) {
                    let starterMessage = (await message.channel?.fetchStarterMessage().catch(() => null)) ?? null;
                    let owner = (await message.channel?.fetchOwner().catch(() => null)) ?? null;

                    isThreadEligible = starterMessage?.author?.id === client.user.id || starterMessage?.cleanContent?.toLowerCase()?.includes('elysium') || owner?.id === client.user.id;
                };

                if (message.content.toLowerCase().includes('elysium') || message.mentions.users.has(client.user.id) || (guild?.aiChannel?.status && guild?.aiChannel?.channel === message.channelId) || (guild?.randomChat?.status && possibility > (100 - (guild?.randomChat?.possibility ?? 1))) || (message.type === MessageType.UserJoin && guild?.welcomer?.status) || isThreadEligible) { }
                else return;
            } else if (!message.author.dmChannel) await message.author.createDM();

            let user = await db.get(`users.${message.author.id}`) ?? {
                usage: 0,
                premium: false,
                mode: 'auto',
                personality: 'elysium',
                saveChatHistory: true,
                chats: {
                    elysium: []
                },
                tier: 0,
                bonus: 0
            };
            let mode = user.mode ?? 'auto';
            let personalityId = user.personality ?? 'elysium';
            let saveHistory = user.saveChatHistory ?? true;
            let personalityData = user.personalities?.[personalityId] ?? {};
            let history = [];

            if ((personalityData.dmOnly && message.guild) || (personalityData.nsfw && (!message.channel.nsfw && message.guild))) personalityId = 'elysium';
            if (!message.guild) history = user.chats?.[personalityId] ?? [];

            let guild = await db.get(`guilds.${message.guild?.id}`);
            let locale = message.locale;
            let personality = {
                name: personalityId === 'elysium' ? 'Elysium' : personalityData?.name ?? 'Elysium',
                description: personalityId === 'elysium' ? null : personalityData?.description ?? null
            };

            console.log('message received:', message.content);

            if (((message.mentions.users.has(client.user.id) || message.content.toLowerCase().includes('elysium')) || (guild?.aiChannel?.status && guild?.aiChannel?.channel === message.channelId) || !message.guild) && !(await db.has(`users.${message.author.id}.verified`))) return message.reply({
                content: localize(locale, 'NOT_VERIFIED'),
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            new ButtonBuilder()
                                .setLabel(localize(locale, 'VERIFY_NOW'))
                                .setStyle(ButtonStyle.Link)
                                .setURL('https://discord.com/api/oauth2/authorize?client_id=786480896928645131&redirect_uri=https%3A%2F%2Felysium-verify.glitch.me%2F&response_type=code&scope=identify')
                        )
                ]
            }).catch(error => console.log(error));

            if (!user.bonus) user.bonus = 0;
            if (!user.tier) user.tier = 0;
            if (user.bonus > 0) {
            } else if (user.tier === 0 && user.usage > 50) return message.reply({
                content: localize('en-US', 'LIMIT_REACHED', 50),
                ephemeral: true
            });
            else if (user.tier === 1 && user.usage > 100) return message.reply({
                content: localize('en-US', 'LIMIT_REACHED', 100),
                ephemeral: true
            });
            else if (user.tier === 2 && user.usage > 250) return message.reply({
                content: localize('en-US', 'LIMIT_REACHED', 250),
                ephemeral: true
            });
            else if (user.tier === 3 && user.usage > 500) return message.reply({
                content: localize('en-US', 'LIMIT_REACHED', 500),
                ephemeral: true
            });
            else {
            };

            /*
            if (message.mentions.users.has(client.user.id) && !(await db.has(`users.${message.author.id}.dismissed`))) {
                await db.set(`users.${message.author.id}.dismissed`, true);

                return message.reply(localize('en-US', 'OWNERS_NOTE')).catch(() => null);
            };
            */

            await message.channel.sendTyping();

            let messages = message.channel.messages.cache.toJSON();

            messages.pop();

            let functions = [];
            let files = [];

            async function respond() {
                console.log('Response', JSON.stringify(response.body, null, 4));

                let choicesMessage = response?.body?.choices?.[0]?.message?.content;

                if (Array.isArray(choicesMessage)) choicesMessage = choicesMessage[0];

                let respondMessage = (choicesMessage ?? 'An error occured, please try again later.').replace(/(User:(\n| ).*|)(\nUser Roles:(\n| ).*|)(\nReplied Message Author:(\n| ).*|)(\nReplied Message:(\n| ).*|)(\nMessage Attachments:(\n| ).*|)(\nMessage:(\n| )|)/g, '').replace('[16K-Optional]', '')

                if (functions.length > 0) {
                    await db.set(`functions.${message.id}`, functions);

                    timer('custom', { // 24 hours
                        time: 24 * 60 * 60 * 1000,
                        callback: async () => await db.delete(`functions.${c.messageId}`),
                        config: {
                            messageId: message.id
                        }
                    });
                };

                let parsedMentions = respondMessage.match(/<@!?(\d+)>/g);

                // remove dublicated mentions
                parsedMentions = parsedMentions?.filter((mention, index) => parsedMentions.indexOf(mention) === index);

                console.log('Parsed mentions', parsedMentions?.map(mention => mention.replace(/<@!?(\d+)>/g, '$1')));

                // chunk the message for each 2000 characters
                respondMessage = respondMessage.match(/[\s\S]{1,2000}/g);

                if (respondMessage[0].length > 1000) {
                    if (replied) await replied.edit('Creating thread...');
                    else replied = await message.reply({
                        content: 'Creating thread...',
                        allowedMentions: {
                            repliedUser: false
                        }
                    });

                    let threadName = await request({
                        url: 'https://beta.purgpt.xyz/openai/chat/completions',
                        method: RequestMethod.Post,
                        body: {
                            model: 'gpt-3.5-turbo',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'You will only respond with a JSON format, nothing else. Your format must look like this: {name: "max 100 characters"}'
                                },
                                {
                                    role: 'user',
                                    content: 'Give a topic name for this message:\nHey, I\'m having trouble with this code. Can someone help me out?',
                                    name: 'example_user'
                                },
                                {
                                    role: 'assistant',
                                    content: '{name: "Having trouble with code"}',
                                },
                                {
                                    role: 'user',
                                    content: 'Give a topic name for this message:\nHey, I\'m having trouble with this code. Can someone help me out?',
                                    name: 'example_user'
                                },
                                {
                                    role: 'assistant',
                                    content: '{name: "Having trouble with code"}',
                                },
                                {
                                    role: 'user',
                                    content: `Give a topic name for this message:\n${message.cleanContent}`,
                                }
                            ]
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                        }
                    });

                    console.log('Thread name', threadName.ok ? threadName.body.choices[0].message.content : threadName);

                    if (threadName.ok) {
                        threadName = threadName.body.choices[0].message.content;

                        try {
                            threadName = JSON.parse(threadName);
                            threadName = threadName.name.slice(0, 100) ?? 'Elysium'
                        } catch (error) {
                            threadName = message.cleanContent.slice(0, 100) ?? 'Elysium';
                        };
                    } else threadName = message.cleanContent.slice(0, 100) ?? 'Elysium';

                    const thread = await message.startThread({
                        name: threadName
                    }).catch(error => console.log(error));

                    if (thread) {
                        if (replied) await replied.delete();

                        replied = await thread.send('Waiting for response...');
                    };
                };

                if (replied) replied.edit({
                    content: respondMessage[0],
                    components: functions.length > 0 ? [
                        new ActionRowBuilder()
                            .setComponents(
                                new ButtonBuilder()
                                    .setCustomId(`functions:${message.id}`)
                                    .setLabel(localize(locale, 'SHOW_FUNCTIONS'))
                                    .setStyle(ButtonStyle.Secondary)
                            )
                    ] : [],
                    allowedMentions: {
                        users: parsedMentions?.map(mention => mention.replace(/<@!?(\d+)>/g, '$1')),
                        roles: [],
                        repliedUser: message.type === MessageType.UserJoin && guild?.welcomer?.status ? true : respondMessage.includes(`<@${message.author.id}>`)
                    },
                    files: files.splice(0, 10)
                }).catch(error => {
                    console.log('Error while editing replied message:', error)

                    replied.edit('An error occured while sending the message. Please try again later.').catch(() => null);
                });
                else message.reply({
                    content: respondMessage[0],
                    allowedMentions: {
                        users: parsedMentions?.map(mention => mention.replace(/<@!?(\d+)>/g, '$1')),
                        roles: [],
                        repliedUser: message.type === MessageType.UserJoin && guild?.welcomer?.status ? true : respondMessage.includes(`<@${message.author.id}>`)
                    },
                    components: functions.length > 0 ? [
                        new ActionRowBuilder()
                            .setComponents(
                                new ButtonBuilder()
                                    .setCustomId(`functions:${message.id}`)
                                    .setLabel(localize(locale, 'SHOW_FUNCTIONS'))
                                    .setStyle(ButtonStyle.Secondary)
                            )
                    ] : [],
                    files: files.splice(0, 10)
                }).catch(error => {
                    console.log(error);

                    message.reply('An error occured while sending the message. Please try again later.').catch(() => null);
                });
                if (respondMessage.length > 1) {
                    for (let i = 1; i < respondMessage.length; i++) {
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        (replied ?? message).channel.send({
                            content: respondMessage[i],
                            allowedMentions: {
                                users: parsedMentions?.map(mention => mention.replace(/<@!?(\d+)>/g, '$1')),
                                roles: [],
                                repliedUser: message.type === MessageType.UserJoin && guild?.welcomer?.status ? true : respondMessage.includes(`<@${message.author.id}>`)
                            },
                            files: files.splice(0, 10)
                        });
                    };
                };

                if (!message.guild && saveHistory) {
                    let messageHistory = await db.get(`users.${message.author.id}.chats.${personalityId}`) ?? [];

                    messageHistory.push({
                        role: 'user',
                        content: `User: ${message.member?.displayName ?? message.author.displayName} (mention: <@${message.author.id}>)${message.member ? `\nUser Roles: ${message.member.roles.cache.map(role => `@${role.name}`).join(', ')}` : ''}${reply ? `\nReplied Message Author:\n${reply.member?.displayName ?? reply.author.displayName}\nReplied Message:\n${reply.cleanContent}` : ''}\nMessage:\n${message.type === MessageType.UserJoin ? 'User has been joined to the server.' : message.cleanContent}`,
                        name: message.author.id,
                        messageId: message.id
                    });
                    messageHistory.push({
                        role: 'assistant',
                        content: respondMessage.join(''),
                        name: personalityId === 'elysium' ? 'Elysium' : personalityData?.name,
                        messageId: message.id
                    });

                    await db.set(`users.${message.author.id}.chats.${personalityId}`, messageHistory.splice(0, 100));
                };
                if ((message.mentions.users.has(client.user.id) || message.content.toLowerCase().includes('elysium')) || (guild?.randomChat?.status && guild?.randomChat?.channel === message.channelId)) {
                    if (user.bonus > 0) {
                        user.bonus--;

                        await db.set(`users.${message.author.id}.bonus`, user.bonus);
                    } else {
                        user.usage++;

                        await db.set(`users.${message.author.id}.usage`, user.usage);
                    };
                };

                let trainingEnabled = await db.get(`training.${message.author.id}`);

                if (trainingEnabled) await db.push('trainMessages', {
                    message: message.cleanContent,
                    response: respondMessage.join(''),
                });

                console.log(`${message.author.username} (${message.author.id}) used the bot. Usage: ${user.usage}`);
            };

            let response = {};
            let oldMessages = messages;

            messages = [];

            if (message.guild) {
                for (let msg of oldMessages) {
                    let reply;

                    if (msg.reference?.messageId) reply = await msg.fetchReference().catch(() => null);

                    messages.push({
                        role: msg.author.id === client.user.id ? 'assistant' : 'user',
                        content: msg.author.id === client.user.id ? msg.content : `User: ${msg.member?.displayName ?? msg.author.displayName} (mention: <@${msg.author.id}>)${msg.member ? `\nUser Roles: ${msg.member.roles.cache.map(role => `@${role.name}`).join(', ')}` : ''}${reply ? `\nReplied Message Author:\n${reply.member?.displayName ?? reply.author.displayName}\nReplied Message:\n${reply.cleanContent}` : ''}${msg.attachments.size > 0 ? `\nMessage Attachments: ${msg.attachments.map(attachment => `${attachment.url} (${attachment.name}, ${attachment.description ?? 'no description'})`).join(', ')}` : ''}\nMessage:\n${msg.cleanContent}`,
                        name: msg.author.id
                    });
                };
            } else messages = history.map(message => {
                delete message.messageId;

                return message;
            });

            let owner;

            if (message.guild) owner = await message.guild.fetchOwner();

            messages.push({
                role: 'system',
                content: `You are ${personalityId === 'elysium' ? 'Elysium' : personality.name}. You are chatting in a Discord server. Here are some information about your environment:\nServer: ${message.guild?.name ?? 'DMs'}${message.guild ? `\nServer Owner: ${owner.displayName}\nServer Description: ${message.guild.description ?? 'None'}` : ''}\nChannel: ${message.channel.name ?? `@${message.author.username}`} (mention: <#${message.channelId}>)\nChannel Description: ${message.channel.topic ?? 'None'}`
            });
            messages.push({
                role: 'system',
                content: personality.description ?? defaultPersonality
            });

            let reply;

            if (message.reference?.messageId) reply = await message.fetchReference();

            messages.push({
                role: 'user',
                content: `User: ${message.member?.displayName ?? message.author.displayName} (mention: <@${message.author.id}>)${message.member ? `\nUser Roles: ${message.member.roles.cache.map(role => `@${role.name}`).join(', ')}` : ''}${reply ? `\nReplied Message Author:\n${reply.member?.displayName ?? reply.author.displayName}\nReplied Message:\n${reply.cleanContent}` : ''}${message.attachments.size > 0 ? `\nMessage Attachments: ${message.attachments.map(attachment => `${attachment.url} (${attachment.name}, ${attachment.description ?? 'no description'})`).join(', ')}` : ''}\nMessage:\n${message.type === MessageType.UserJoin ? 'User has been joined to the server.' : message.cleanContent}`,
                name: message.author.id
            });

            // log last 5 messages
            console.log(messages.slice(-5));

            let requestFunctions = [
                {
                    name: 'fetch_channels',
                    description: 'Fetches all channels in the server.',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'fetch_roles',
                    description: 'Fetches all roles in the server.',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'fetch_emojis',
                    description: 'Fetches all emojis in the server.',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'fetch_pins',
                    description: 'Fetches all pins in the server.',
                    parameters: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'web_search',
                    description: 'Search Google and return top 10 results',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Query to search on Google.'
                            }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'ai_tools',
                    description: 'Searches AI tools',
                    parameters: {
                        type: 'object',
                        properties: {
                            limit: {
                                type: 'number',
                                description: 'Limit of the results.'
                            },
                            search: {
                                type: 'string',
                                description: 'Query to search AI tools.'
                            }
                        },
                        required: ['search']
                    }
                },
                {
                    name: 'draw_image',
                    description: 'Draws an image',
                    parameters: {
                        type: 'object',
                        properties: {
                            prompt: {
                                type: 'string',
                                description: 'The prompt you want to draw. Do not use simple and short prompts. More details means better images. Please include much details as possible. Prompts must be English.'
                            },
                            count: {
                                type: 'number',
                                description: 'The number of images you want to draw.'
                            }
                        },
                        required: ['prompt']
                    }
                },
                {
                    name: 'react_message',
                    description: 'Reacts to the message with an emoji',
                    parameters: {
                        type: 'object',
                        properties: {
                            emoji: {
                                type: 'string',
                                description: 'The emoji id or unicode emoji to react. Example: 1234567890 or 😂'
                            }
                        },
                        required: ['emoji']
                    }
                },
                {
                    name: 'member_mention',
                    description: 'Searches members in the server and shows their mention.',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Name of the member to search.'
                            }
                        },
                        required: ['name']
                    }
                },
                {
                    name: 'send_dm',
                    description: 'Sends direct message to the user. Please do not spam.',
                    parameters: {
                        type: 'object',
                        properties: {
                            message: {
                                type: 'string',
                                description: 'The message content to send.'
                            },
                            send_files: {
                                type: 'boolean',
                                description: 'Whether the collected files (for example drawen images) will be sent along with the nessage. Default: false'
                            }
                        },
                        required: ['message']
                    }
                },
                {
                    name: 'read_file',
                    description: 'Reads a file from the message attachments. You can only read .png, .jpg, .txt and .json files. You can use this function to see the sent files.',
                    parameters: {
                        type: 'object',
                        properties: {
                            type: {
                                type: 'string',
                                description: 'Can only be "image" or "text". If the extension is .png or .jpg, you should use "image". If the extension is .txt or .json, you should use "text".'
                            },
                            url: {
                                type: 'string',
                                description: 'The url of the file to read.'
                            }
                        },
                        required: ['type', 'url']
                    }
                }
            ];

            if (user.tier === 3) requestFunctions.push({
                name: 'summarize_page',
                description: 'Summarizes a web page. You can use this function to find some information about a web page.',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The url of the web page to summarize.'
                        },
                        question: {
                            type: 'string',
                            description: 'The question to ask about the web page. Don\'t use this parameter if you want to summarize the web page.'
                        }
                    },
                    required: ['url']
                }
            });

            let replied;

            function functionMessage(functionName) {
                let responseMessage = response.body?.choices?.[0]?.message?.content;

                switch (functionName) {
                    case 'fetch_channels':
                        return responseMessage ? `${responseMessage} **(Fethcing server channels...)**` : 'Fethcing server channels...';
                    case 'fetch_roles':
                        return responseMessage ? `${responseMessage} **(Fethcing server roles...)**` : 'Fetching server roles...';
                    case 'fetch_emojis':
                        return responseMessage ? `${responseMessage} **(Fethcing server emojis...)**` : 'Fetching server emojis...';
                    case 'fetch_pins':
                        return responseMessage ? `${responseMessage} **(Fethcing channel pins...)**` : 'Fetching channel pins...';
                    case 'web_search':
                        return responseMessage ? `${responseMessage} **(Searching on Google...)**` : 'Searching on Google...';
                    case 'ai_tools':
                        return responseMessage ? `${responseMessage} **(Searching AI tools...)**` : 'Searching AI tools...';
                    case 'draw_image':
                        return responseMessage ? `${responseMessage} **(Drawing image...)**` : 'Drawing image...';
                    case 'react_message':
                        return responseMessage ? `${responseMessage} **(Reacting to message...)**` : 'Reacting to message...';
                    case 'member_mention':
                        return responseMessage ? `${responseMessage} **(Searching server members...)**` : 'Searching server members...';
                    case 'send_dm':
                        return responseMessage ? `${responseMessage} **(Sending direct message...)**` : 'Sending direct message...';
                    case 'read_file':
                        return responseMessage ? `${responseMessage} **(Reading file...)**` : 'Reading file...';
                    case 'summarize_page':
                        return responseMessage ? `${responseMessage} **(Summarizing web page...)**` : 'Summarizing web page...';
                    default:
                        return 'Calling function...';
                };
            };

            async function useFunction(functionName, parameters) {
                if (functionName === 'fetch_channels') return !message.guild ? "You can't do this in DMs." : JSON.stringify((await message.guild.channels.fetch()).filter(channel => channel && channel.type !== ChannelType.GuildCategory).toJSON().map(channel => `#${channel.name} (<#${channel.id}>)`));
                else if (functionName === 'fetch_roles') return !message.guild ? "You can't do this in DMs." : JSON.stringify((await message.guild.roles.fetch()).toJSON().map(role => `@${role.name}`));
                else if (functionName === 'fetch_emojis') return !message.guild ? "You can't do this in DMs." : JSON.stringify(message.guild.emojis.cache.toJSON().map(emoji => `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`));
                else if (functionName === 'fetch_pins') return JSON.stringify((await message.channel.messages.fetchPinned()).toJSON().map(message => `@${message.author.username} (<@${message.author.id}>)\n${message.cleanContent}`));
                else if (functionName === 'web_search') {
                    let results = (await axios.post('https://websearch.plugsugar.com/api/plugins/websearch', {
                        query: parameters.query
                    }).catch(() => null))?.data;

                    if (!results) return 'Function call failed.';

                    // if the result length is more than 500, cut it
                    if (results.length > 500) results = `${results.slice(0, 500)}...`;

                    return JSON.stringify(results);
                } else if (functionName === 'ai_tools') {
                    let results = (await axios.post('https://www.aitoolhunt.com/api/fetchtools', {
                        limit: parameters.limit ?? 20,
                        search: parameters.search,
                        start: 0
                    })).data;

                    return JSON.stringify(results);
                } else if (functionName === 'draw_image') {
                    let results = await request({
                        url: 'https://beta.purgpt.xyz/stabilityai/images/generations',
                        method: RequestMethod.Post,
                        body: {
                            model: 'sdxl',
                            prompt: parameters.prompt,
                            n: parameters.count ?? 1
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                        }
                    });

                    if (!results.ok) results = await request({
                        url: 'https://beta.purgpt.xyz/prodia/images/generations',
                        method: RequestMethod.Post,
                        body: {
                            model: 'anything-diffusion-5',
                            prompt: parameters.prompt,
                            n: parameters.count ?? 1
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                        }
                    });

                    if (!results.ok) results = await request({
                        url: 'https://beta.purgpt.xyz/hugging-face/images/generations',
                        method: RequestMethod.Post,
                        body: {
                            model: 'stable-diffusion-1.5',
                            prompt: parameters.prompt,
                            n: parameters.count ?? 1
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                        }
                    });

                    if (results.ok) files = files.concat(results.body.data.map(image => image.url));

                    return results.ok ? 'Your image has been drawn and will be sent along with your message.' : 'Function call failed.';
                } else if (functionName === 'react_message') {
                    await message.react(parameters.emoji).catch(() => null);

                    return 'Reacted to message.';
                } else if (functionName === 'member_mention') return !message.guild ? "You can't do this in DMs." : JSON.stringify(message.guild.members.cache.filter(member => member.displayName.toLowerCase().includes(parameters.name.toLowerCase())).toJSON().map(member => `@${member.displayName} (<@${member.id}>)`));
                else if (functionName === 'send_dm') {
                    if (!message.guild) return 'You are already in DMs.';

                    let user = await client.users.fetch(message.author).catch(() => null);

                    if (!user) return 'User not found.';
                    if (!user.dmChannel) await user.createDM();

                    await user.dmChannel.send({
                        content: parameters.message,
                        files: parameters.send_files ? files.splice(0, 10) : []
                    }).catch(error => console.log(error));

                    return 'Message has been sent.';
                } else if (functionName === 'read_file') {
                    let file = await axios.get(parameters.url, {
                        responseType: 'arraybuffer'
                    }).catch(() => null);

                    if (!file) return 'Failed to read file.';

                    if (parameters.type === 'image') {
                        let image = await sharp(file.data)
                            .resize(200)
                            .png({
                                compressionLevel: 4,
                                quality: 70
                            })
                            .toBuffer()

                        let explaination = await axios.post('https://beta.purgpt.xyz/hugging-face/images/explain', {
                            model: 'blip-image-captioning-large',
                            image: image.toString('base64')
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                            }
                        });

                        return explaination.status === 200 ? 'Image content: ' + explaination.data.result : 'Failed to read image.';
                    } else if (parameters.type === 'text') {
                        let text = file.data.toString();

                        return `File content: ${text.length > 2000 ? `${text.slice(0, 2000)}...` : text}`;
                    } else return 'Invalid file type.';
                } else if (functionName === 'summarize_page') {
                    let page;

                    try {
                        page = (await axios.get(parameters.url, {
                            responseType: 'text'
                        })).data;
                    } catch (error) {
                        page = localize(locale, 'INVALID_URL');
                    };

                    let response;

                    if (page.length > 36000) page = page.slice(0, 36000) + '...';

                    response = await request({
                        url: 'https://beta.purgpt.xyz/openai/chat/completions',
                        method: RequestMethod.Post,
                        body: {
                            model: 'gpt-3.5-turbo-16k',
                            messages: [
                                {
                                    role: 'user',
                                    content: `${parameters.question ? `Find the answer of "${parameters.question}" question` : 'Summarize'} this page (${parameters.url}):\n\n${page}`
                                }
                            ],
                            fallbacks: ['gpt-3.5-turbo']
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                        }
                    }, {
                        isOk: response => console.log('used purgpt', JSON.stringify(response.body, null, 4)),
                    });

                    return response.ok ? response.body.choices[0].message.content : 'Function call failed.';
                };

            };

            const gpt4Function = [
                {
                    url: 'https://api.nova-oss.com/v1/chat/completions',
                    model: 'gpt-4',
                    key: 'NOVA_API_KEY',
                    function: true
                }
            ];

            if (user.gpt4) gpt4Function.push({
                url: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4-0613',
                key: 'OPENAI_API_KEY',
                function: true
            });

            const gpt4Functionless = [
                {
                    url: 'https://elysium-verify.glitch.me/daku?path=/chat/completions',
                    model: 'gpt-4',
                    key: 'VERIFY_KEY',
                    function: false
                },
                {
                    url: 'https://public.personalapi.repl.co/api/v2/chat/completions',
                    model: 'gpt-4',
                    key: 'GENIUSAI_API_KEY',
                    function: false
                },
                {
                    url: 'https://beta.purgpt.xyz/openai/chat/completions',
                    model: 'gpt-4',
                    key: 'PURGPT_API_KEY',
                    function: false
                }
            ];
            const gpt35Function = [
                {
                    url: 'https://elysium-verify.glitch.me/daku?path=/chat/completions',
                    model: 'gpt-3.5-turbo-16k-0613',
                    key: 'VERIFY_KEY',
                    function: true
                },
                {
                    url: 'https://thirdparty.webraft.in/v1/chat/completions',
                    model: 'gpt-3.5-turbo-16k',
                    key: 'WEBRAFT_API_KEY',
                    function: true
                },
                {
                    url: 'https://api.openai.com/v1/chat/completions',
                    model: 'gpt-3.5-turbo-16k-0613',
                    key: 'OPENAI_API_KEY',
                    function: true
                }
            ];
            const gpt35Functionless = [
                {
                    url: 'https://galaxyai.onrender.com/v1/chat/completions',
                    model: 'gpt-3.5-turbo-16k',
                    key: 'GALAXYAI_API_KEY',
                    function: false
                },
                {
                    url: 'https://beta.purgpt.xyz/openai/chat/completions',
                    model: 'gpt-3.5-turbo-16k',
                    key: 'PURGPT_API_KEY',
                    function: false
                }
            ];

            async function tryRequest(type = 'all') {
                let requestFunction;

                if (type === 'all') requestFunction = gpt4Function.concat(gpt4Functionless, gpt35Function, gpt35Functionless);
                else if (type === 'functionOnly') requestFunction = gpt4Function.concat(gpt4Function);

                for (let func of requestFunction) {
                    response = await request({
                        url: func.url,
                        method: RequestMethod.Post,
                        body: {
                            model: func.model,
                            messages: messages,
                            functions: func.function ? requestFunctions : null
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env[func.key]}`,
                            'x-daku-key': func.key === 'VERIFY_KEY' ? process.env.DAKU_API_KEY : null
                        }
                    }, {
                        isOk: response => console.log('used', func.url, JSON.stringify(response.body, null, 4)),
                        isNotOk: response => console.log('error', func.url, JSON.stringify(response.body, null, 4))
                    });

                    if (response.ok && response.body?.choices && !['Internal Server Error', 'GPT-4 is down or your context is over 7100.'].includes(response.body?.choices?.[0]?.message?.content)) {
                        response.url = func.url;

                        return {
                            response,
                            url: func.url
                        };
                    };
                };

                return false;
            };

            if (mode === 'auto') response = await tryRequest();
            else if (mode === 'functionOnly') response = await tryRequest('functionOnly');

            if (response) {
                let usedUrl = response.url;
                let end = false;

                response = response.response;

                console.log('Used model', response.body.model, 'Used url', usedUrl);
                console.log('Response', JSON.stringify(response.body, null, 4));

                while (!end) {
                    let isFunction = response.body?.choices?.[0]?.finish_reason === 'function_call';

                    if (!isFunction) {
                        end = true;

                        break;
                    };

                    let usedFunction = response.body.choices[0].message?.function_call;
                    let functionResponse;
                    let parameters = {};

                    if (!usedFunction) usedFunction = response.body.choices[0].function_call;
                    if (usedFunction.arguments) parameters = JSON.parse(usedFunction.arguments);

                    console.log('Function call detected', usedFunction, parameters);

                    if (replied) replied.edit(functionMessage(usedFunction.name));
                    else replied = await message.reply({
                        content: functionMessage(usedFunction.name),
                        allowedMentions: {
                            roles: [],
                            repliedUser: message.type === MessageType.UserJoin && guild?.welcomer?.status ? true : false
                        }
                    });

                    functionResponse = await useFunction(usedFunction.name, parameters);

                    console.log('Function response', functionResponse);

                    messages.push({
                        role: 'function',
                        name: usedFunction?.name?.length > 0 ? usedFunction.name : 'unknown',
                        content: functionResponse
                    });
                    messages.push({
                        role: 'system',
                        content: 'You will NOT repeat functions.'
                    });
                    functions.push({
                        name: usedFunction?.name?.length > 0 ? usedFunction.name : 'unknown',
                        parameters,
                        response: functionResponse
                    });

                    await new Promise(resolve => setTimeout(resolve, 1000));

                    response = await tryRequest();

                    if (!response) {
                        response = {
                            ok: false
                        };

                        break;
                    } else response = response.response;

                    console.log('Used model', response.body.model, 'Used url', response.url);
                };

                if (response.ok) return respond();
            };

            if (response.ok) return respond();
            else if (message.mentions.users.has(client.user.id)) return message.reply({
                content: localize(locale, 'MODELS_DOWN'),
                allowedMentions: {
                    roles: [],
                    repliedUser: false
                }
            });
        } catch (error) {
            console.log('Error', error);
        };
    });

app.get('/verify', async (req, res) => {
    let key = req.headers.authorization;

    if (key !== process.env.VERIFY_KEY) return res.status(401).send('Unauthorized');

    res.status(204).send();

    let user = req.query.user.replaceAll('.', '_');
    let id = req.query.id;

    if (await db.has(`verified.${user}`)) {
        if (!client.users.cache.get(id).dmChannel) await client.users.cache.get(id).createDM();

        return client.users.cache.get(id).send({
            content: 'Your verification denied because you are probably using multiple accounts. If you think this is a mistake, please join our Discord server.\n\nIf you already got the verified message, please ignore this message.',
            components: [
                new ActionRowBuilder()
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel('Join Discord Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://discord.gg/experiments')
                    )
            ]
        }).catch(() => null);
    } else {
        await db.set(`verified.${user}`, id);
        await db.set(`users.${id}.verified`, user);

        if (!client.users.cache.get(id)?.dmChannel) await client.users.cache.get(id).createDM();

        if (client.users.cache.get(id)) return client.users.cache.get(id).send('You are successfully verified!').catch(() => null);
    };
});

async function runOnMonday() {
    let users = await db.get('users') ?? {};

    for (let user in users) {
        await db.set(`users.${user}.usage`, 0);
    };

    console.log('Reset usage');

    let data = await db.get('trainMessages');

    writeFileSync('./trainMessages.json', JSON.stringify((data ?? []), null, 4), 'utf-8');
    //execSync('git add . && git commit -m "Save train messages" && git push');

    console.log('Saved train messages');
};

function startInterval() {
    const now = new Date();
    const daysUntilMonday = (8 - now.getUTCDay()) % 7; // Calculate days until next Monday
    const nextMonday = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0);
    const timeUntilMonday = nextMonday - now;

    setTimeout(() => {
        runOnMonday();
        setInterval(runOnMonday, 7 * 24 * 60 * 60 * 1000); // Repeat every 7 days
    }, timeUntilMonday);
};

startInterval();

client.login(process.env.DISCORD_TOKEN);

// Set an interval to check if it's the first day of the month every day
setInterval(checkFirstDayOfMonth, 86400000);