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
const crypto = require('crypto');
const { AttachmentBuilder } = require("discord.js");
const { StringSelectMenuBuilder } = require("@discordjs/builders");
const { StringSelectMenuOptionBuilder } = require("discord.js");
const { InteractionCollector } = require("discord.js");
const { chatCompletion } = require("./modules/ai");

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

    if (!(await db.has('memories'))) await db.set('memories', []);

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
                    break;
                case 'feedback':
                    let reply = await interaction.deferReply({ ephemeral: true, fetchReply: true });

                    let trainMessage = await db.get(`trainMessages2.${interaction.message.reference.messageId}`);

                    if (trainMessage.user !== interaction.user.id) return interaction.editReply(localize(interaction.locale, 'NOT_ALLOWED'));
                    if (args[0] === 'good') {
                        writeFileSync(`feedback-${interaction.message.id}.json`, JSON.stringify({
                            feedback: {
                                personality: true,
                                correct: true,
                                humanLike: true
                            },
                            message: trainMessage
                        }, null, 4), 'utf-8');

                        await client.channels.cache.get('1138469613429084192').send({
                            content: 'New feedback',
                            files: [
                                new AttachmentBuilder()
                                    .setFile(`feedback-${interaction.message.id}.json`)
                                    .setName('feedback.json')
                            ]
                        }).then(msg => msg.react('✅'));

                        execSync(`rm feedback-${interaction.message.id}.json`);

                        interaction.editReply(localize(interaction.locale, 'FEEDBACK_SENT'));
                        interaction.message.edit({
                            components: []
                        });
                    } else {
                        interaction.editReply({
                            components: [
                                new ActionRowBuilder()
                                    .setComponents(
                                        new StringSelectMenuBuilder()
                                            .setCustomId('feedback-reason')
                                            .setPlaceholder(localize(interaction.locale, 'FEEDBACK_SELECT_REASON'))
                                            .setOptions(
                                                new StringSelectMenuOptionBuilder()
                                                    .setLabel(localize(interaction.locale, 'FEEDBACK_REASON_PERSONALITY'))
                                                    .setValue('personality'),
                                                new StringSelectMenuOptionBuilder()
                                                    .setLabel(localize(interaction.locale, 'FEEDBACK_REASON_CORRECT'))
                                                    .setValue('correct'),
                                                new StringSelectMenuOptionBuilder()
                                                    .setLabel(localize(interaction.locale, 'FEEDBACK_REASON_HUMAN_LIKE'))
                                                    .setValue('human_like')
                                            )
                                            .setMaxValues(3)
                                    )
                            ]
                        });

                        const collector = new InteractionCollector(client, {
                            message: reply,
                            time: 60000,
                            filter: i => i.user.id === interaction.user.id && i.isMessageComponent() && i.customId === 'feedback-reason'
                        });

                        collector.on('collect', async i => {
                            collector.stop();

                            let reason = i.values;

                            writeFileSync(`feedback-${interaction.message.id}.json`, JSON.stringify({
                                feedback: {
                                    personality: !reason.includes('personality'),
                                    correct: !reason.includes('correct'),
                                    humanLike: !reason.includes('human_like')
                                },
                                message: trainMessage
                            }, null, 4), 'utf-8');

                            await client.channels.cache.get('1138469613429084192').send({
                                content: 'New feedback',
                                files: [
                                    new AttachmentBuilder()
                                        .setFile(`feedback-${interaction.message.id}.json`)
                                        .setName('feedback.json')
                                ]
                            }).then(msg => msg.react('✅'));

                            execSync(`rm feedback-${interaction.message.id}.json`);

                            interaction.editReply({
                                content: localize(interaction.locale, 'FEEDBACK_SENT'),
                                components: []
                            });
                            interaction.message.edit({
                                components: []
                            });
                        });
                    };
                    break;
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
            let context;
            let trainMessage;

            async function respond() {
                console.log('Response:', response?.response);

                let choicesMessage = response?.response;

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

                await db.set(`trainMessages2.${message.id}`, {
                    context,
                    trainMessage: trainMessage,
                    functions,
                    respondMessage,
                    user: message.author.id
                });

                timer('custom', { // 24 hours
                    time: 24 * 60 * 60 * 1000,
                    callback: async () => await db.delete(`trainMessages2.${c.messageId}`),
                    config: {
                        messageId: message.id
                    }
                });

                let parsedMentions = respondMessage.match(/<@!?(\d+)>/g);

                // remove dublicated mentions
                parsedMentions = parsedMentions?.filter((mention, index) => parsedMentions.indexOf(mention) === index);

                console.log('Parsed mentions', parsedMentions?.map(mention => mention.replace(/<@!?(\d+)>/g, '$1')));

                // chunk the message for each 2000 characters
                respondMessage = respondMessage.match(/[\s\S]{1,2000}/g);

                if (respondMessage[0].length > 1000) {
                    if (response.reply) await response.reply.edit('Creating thread...');
                    else replied = await message.reply({
                        content: 'Creating thread...',
                        allowedMentions: {
                            repliedUser: false
                        }
                    });

                    let threadName = await chatCompletion([
                        {
                            role: 'system',
                            content: 'You will only respond with a JSON format, nothing else. Your format must look like this: {"name": "max 100 characters"}'
                        },
                        {
                            role: 'user',
                            content: 'Give a topic name for this message:\nHey, I\'m having trouble with this code. Can someone help me out?',
                            name: 'example_user'
                        },
                        {
                            role: 'assistant',
                            content: '{"name": "Having trouble with code"}',
                        },
                        {
                            role: 'user',
                            content: 'Give a topic name for this message:\nHey, I\'m having trouble with this code. Can someone help me out?',
                            name: 'example_user'
                        },
                        {
                            role: 'assistant',
                            content: '{"name": "Having trouble with code"}',
                        },
                        {
                            role: 'user',
                            content: `Give a topic name for this message:\n${message.cleanContent}`,
                        }
                    ], {
                        tier1: user.tier >= 1,
                        tier2: user.tier >= 2,
                        tier3: user.tier >= 3,
                        message,
                        client,
                        disableFunctions: true
                    });

                    console.log(threadName);

                    if (threadName) {
                        threadName = threadName?.response;

                        try {
                            threadName = JSON.parse(threadName);
                            threadName = threadName.name.slice(0, 100) ?? 'Elysium'
                        } catch (error) {
                            console.log('Error while parsing thread name:', error);

                            threadName = message.cleanContent.slice(0, 100) ?? 'Elysium';
                        };
                    } else threadName = message.cleanContent.slice(0, 100) ?? 'Elysium';

                    const thread = await message.startThread({
                        name: threadName
                    }).catch(error => console.log(error));

                    if (thread) {
                        if (replied) await replied.delete();

                        response.reply = await thread.send('Waiting for response...');
                    };
                };

                let buttons = functions.length > 0 ? [
                    new ActionRowBuilder()
                        .setComponents(
                            new ButtonBuilder()
                                .setCustomId(`functions:${message.id}`)
                                .setLabel(localize(locale, 'SHOW_FUNCTIONS'))
                                .setStyle(ButtonStyle.Secondary)
                        )
                ] : [];

                if (response.reply) response.reply.edit({
                    content: respondMessage[0],
                    components: buttons,
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
                    components: buttons,
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
                        name: personalityId === 'elysium' ? 'elysium' : personalityData?.name?.toLowerCase().replaceAll(' ', '-').replaceAll(/[^a-zA-Z0-9]/g, ''),
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

            let memories = await db.get('memories');

            context = `You are ${personalityId === 'elysium' ? 'Elysium' : personality.name}. You are chatting in a Discord server. Here are some information about your environment:\nServer: ${message.guild?.name ?? 'DMs'}${message.guild ? `\nServer Owner: ${owner.displayName}\nServer Description: ${message.guild.description ?? 'None'}` : ''}\nChannel: ${message.channel.name ?? `@${message.author.username}`} (mention: <#${message.channelId}>)\nChannel Description: ${message.channel.topic ?? 'None'}\nUTC date: ${new Date().toUTCString()}\n\n${personality.description ?? defaultPersonality}\n\nYour memories:\n${memories.map(memory => `- ${memory.memory}`).join('\n')}`;

            messages.push({
                role: 'system',
                content: `You are ${personalityId === 'elysium' ? 'Elysium' : personality.name}. You are chatting in a Discord server. Here are some information about your environment:\nServer: ${message.guild?.name ?? 'DMs'}${message.guild ? `\nServer Owner: ${owner.displayName}\nServer Description: ${message.guild.description ?? 'None'}` : ''}\nChannel: ${message.channel.name ?? `@${message.author.username}`} (mention: <#${message.channelId}>)\nChannel Description: ${message.channel.topic ?? 'None'}\nNSFW Allowed In This Channel: ${message.guild ? message.channel.nsfw : true}\nUTC date: ${new Date().toUTCString()}`
            });
            messages.push({
                role: 'system',
                content: personality.description ?? defaultPersonality
            });
            messages.push({
                role: 'system',
                content: `Your memories:\n${memories.map(memory => `- ${memory.memory}`).join('\n')}`
            });

            let reply;

            if (message.reference?.messageId) reply = await message.fetchReference();

            trainMessage = {
                username: message?.member?.displayName ?? message.author.displayName,
                userId: message.author.id,
                userRoles: message.member?.roles.cache.map(role => role.name) ?? [],
                repliedMessage: {
                    author: reply?.member?.displayName ?? reply?.author?.displayName,
                    content: reply?.cleanContent ?? null
                },
                attachments: message.attachments.map(attachment => attachment.url),
                message: message.cleanContent
            };

            messages.push({
                role: 'user',
                content: `User: ${message.member?.displayName ?? message.author.displayName} (mention: <@${message.author.id}>)${message.member ? `\nUser Roles: ${message.member.roles.cache.map(role => `@${role.name}`).join(', ')}` : ''}${reply ? `\nReplied Message Author:\n${reply.member?.displayName ?? reply.author.displayName}\nReplied Message:\n${reply.cleanContent}` : ''}${message.attachments.size > 0 ? `\nMessage Attachments: ${message.attachments.map(attachment => `${attachment.url} (${attachment.name}, ${attachment.description ?? 'no description'})`).join(', ')}` : ''}\nMessage:\n${message.type === MessageType.UserJoin ? 'User has been joined to the server.' : message.cleanContent}\nUTC Message Date: ${message.createdAt.toUTCString()}`,
                name: message.author.id
            });

            // log last 5 messages
            console.log(messages.slice(-5));

            response = await chatCompletion(messages, {
                tier1: user.tier >= 1,
                tier2: user.tier >= 2,
                tier3: user.tier >= 3,
                message,
                client,
                functionMessages: {
                    fetch_channels: 'Fetching server channels...',
                    fetch_roles: 'Fetching server roles...',
                    fetch_emojis: 'Fetching server emojis...',
                    fetch_pins: 'Fetching channel pins...',
                    web_search: 'Searching on Google...',
                    ai_tools: 'Searching AI tools...',
                    draw_image: 'Drawing image...',
                    react_message: 'Reacting to message...',
                    member_mention: 'Searching server members...',
                    send_dm: 'Sending direct message...',
                    read_file: 'Reading file...',
                    summarize_page: 'Summarizing web page...',
                    save_memory: 'Saving memory...'
                },
                functions: {
                    fetch_channels: async (parameters, options) => JSON.stringify((await options.message.guild.channels.fetch()).filter(channel => channel && channel.type !== ChannelType.GuildCategory).toJSON().map(channel => `#${channel.name} (<#${channel.id}>)`)),
                    fetch_roles: async (parameters, options) => JSON.stringify((await options.message.guild.roles.fetch()).toJSON().map(role => `@${role.name}`)),
                    fetch_emojis: async (parameters, options) => JSON.stringify(options.message.guild.emojis.cache.toJSON().map(emoji => `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`)),
                    fetch_pins: async (parameters, options) => JSON.stringify((await options.message.channel.messages.fetchPinned()).toJSON().map(message => `@${message.author.username} (<@${message.author.id}>)\n${message.cleanContent}`)),
                    web_search: async (parameters, options) => {
                        let results = (await axios.post('https://websearch.plugsugar.com/api/plugins/websearch', {
                            query: parameters.query
                        }).catch(() => null))?.data;

                        if (!results) return 'Function call failed.';
                        if (results.length > 500) results = `${results.slice(0, 500)}...`;

                        return JSON.stringify(results);
                    },
                    ai_tools: async (parameters, options) => JSON.stringify((await axios.post('https://www.aitoolhunt.com/api/fetchtools', {
                        limit: parameters.limit ?? 20,
                        search: parameters.search,
                        start: 0
                    })).data),
                    draw_image: async (parameters, options) => 'This function is currently disabled.',
                    react_message: async (parameters, options) => {
                        let messageToReact = await options.message.channel.messages.fetch(parameters.messageId).catch(() => null);

                        if (!messageToReact) return 'Function call failed.';

                        await messageToReact.react(parameters.emoji);

                        return 'Reacted to message.';
                    },
                    member_mention: async (parameters, options) => {
                        let member = await options.message.guild.members.fetch(parameters.memberId).catch(() => null);

                        if (!member) return 'Function call failed.';

                        return `<@${member.id}>`;
                    },
                    send_dm: async (parameters, options) => {
                        let user = await client.users.fetch(message.author.id).catch(() => null);

                        if (!user) return 'Function call failed.';

                        await user.send({
                            content: parameters.message,
                            files: parameters.send_files ? files.splice(0, 10) : []
                        });

                        return 'Sent message.';
                    },
                    read_file: async (parameters, options) => {
                        let file = await axios.get(parameters.url).catch(() => null);

                        if (!file) return 'Function call failed.';

                        return file.data;
                    },
                    summarize_page: async (parameters, options) => 'This function is currently disabled.',
                    save_memory: async (parameters, options) => {
                        let memories = await db.get('memories');
                        let memoryId = crypto.randomBytes(16).toString('hex');

                        memories.push({
                            memory: parameters.memory,
                            id: memoryId
                        });

                        await db.set('memories', memories);

                        timer('custom', {
                            time: (parameters.duration ?? 1) * 24 * 60 * 60 * 1000,
                            callback: async () => {
                                let memories = await db.get('memories');

                                memories = memories.filter(memory => memory.id !== c.memoryId);

                                await db.set('memories', memories);
                            },
                            config: {
                                memoryId
                            }
                        });

                        return 'Memory has been saved.';
                    }
                }
            });

            if (response) return respond();
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

function startInterval() {
    const now = new Date();
    const daysUntilMonday = (8 - now.getUTCDay()) % 7; // Calculate days until next Monday
    const nextMonday = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0);
    const timeUntilMonday = nextMonday - now;

    setTimeout(() => setInterval(runOnMonday, 7 * 24 * 60 * 60 * 1000), timeUntilMonday);
};

startInterval();

client.login(process.env.DISCORD_TOKEN);

// Set an interval to check if it's the first day of the month every day
setInterval(checkFirstDayOfMonth, 86400000);