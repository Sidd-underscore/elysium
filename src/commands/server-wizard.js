const { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, GuildFeature, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionCollector, ComponentType, InteractionType, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, GuildPremiumTier } = require("discord.js");
const { localize } = require("../modules/localization");
const EmbedMaker = require("../modules/embed");
const { QuickDB } = require("quick.db");
const { default: axios } = require("axios");
const { emojis } = require("../../config");
const { request, RequestMethod } = require("fetchu.js");

const db = new QuickDB();

module.exports = {
    category: 'Moderator',
    data: new SlashCommandBuilder()
        .setName('server-wizard')
        .setNameLocalizations({
            tr: 'sunucu-sihirbazi'
        })
        .setDescription('Personalize your server with AI')
        .setDescriptionLocalizations({
            tr: 'Sunucunu yapay zeka ile kişiselleştir'
        })
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand => subcommand
            .setName('setup-channels')
            .setNameLocalizations({
                tr: 'kanalları-ayarla'
            })
            .setDescription('Setup channels for your server')
            .setDescriptionLocalizations({
                tr: 'Sunucunuz için kanalları ayarlayın'
            })
            .addStringOption(option => option
                .setName('prompt')
                .setNameLocalizations({
                    tr: 'açıklama'
                })
                .setDescription('Prompt to setup channels')
                .setDescriptionLocalizations({
                    tr: 'Kanalları ayarlamak için açıklama'
                })
                .setRequired(false)
            )
            .addBooleanOption(option => option
                .setName('debug')
                .setNameLocalizations({
                    tr: 'hata-ayıklama'
                })
                .setDescription('Debug mode')
                .setDescriptionLocalizations({
                    tr: 'Hata ayıklama modu'
                })
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('setup-roles')
            .setNameLocalizations({
                tr: 'roller-ayarla'
            })
            .setDescription('Setup roles for your server')
            .setDescriptionLocalizations({
                tr: 'Sunucunuz için rolleri ayarlayın'
            })
            .addStringOption(option => option
                .setName('prompt')
                .setNameLocalizations({
                    tr: 'açıklama'
                })
                .setDescription('Prompt to setup roles')
                .setDescriptionLocalizations({
                    tr: 'Rolleri ayarlamak için açıklama'
                })
                .setRequired(false)
            )
            .addBooleanOption(option => option
                .setName('debug')
                .setNameLocalizations({
                    tr: 'hata-ayıklama'
                })
                .setDescription('Debug mode')
                .setDescriptionLocalizations({
                    tr: 'Hata ayıklama modu'
                })
                .setRequired(false)
            )
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        let reply = await interaction.deferReply({
            fetchReply: true
        });
        let locale = interaction.locale;
        let subcommand = interaction.options.getSubcommand();
        let user = await db.get(`users.${interaction.user.id}`) ?? {
            usage: 0,
            premium: false
        };

        if (user.usage >= 25 && !user.premium) return interaction.editReply(localize(locale, 'LIMIT_REACHED', 25));
        if (subcommand === 'setup-channels') {
            if (!interaction.appPermissions.has('ManageChannels')) return interaction.editReply(localize(locale, 'MISSING_PERMISSION', 'Manage Channels'));

            let prompt = interaction.options.getString('prompt') ?? 'Generate me a server.';
            let debug = interaction.options.getBoolean('debug') ?? false;
            let messages = [
                {
                    role: 'system',
                    content: 'You are Server Wizard. You will setup channels for a Discord server. You will respond with array of channels like this:\n[{"type": "text", "name": "example-channel-without-category", "description": "Maximum 1024 characters description."}, {"type": "category", "name": "Example Category", "channels": [{"type": "text", "name": "example-text", "description": "Maximum 1024 characters description."}, {"type": "voice", "name": "Example Voice"}, {"type": "forum", "name": "example-forum", "description": "Maximum 1024 characters description."}, {"type": "announcement", "name": "Example Announcement", "description": "Maximum 1024 characters description."}, {"type": "stage", "name": "Example Stage"}]}, {"type": "category", "name": "Example Category 2", "channels": [{"type": "text", "name": "example-text-2", "description": "Maximum 1024 characters description."}, {"type": "voice", "name": "Example Voice 2"}, {"type": "forum", "name": "example-forum-2", "description": "Maximum 1024 characters description."}, {"type": "announcement", "name": "example-announcement-2", "description": "Maximum 1024 characters description."}, {"type": "stage", "name": "Example Stage 2"}]}]'
                },
                {
                    role: 'system',
                    content: "Let's do some practice."
                },
                {
                    role: 'user',
                    content: 'Prompt to setup channels:\nCreate a gaming server with at least 2 categories',
                    name: 'example_user'
                },
                {
                    role: 'assistant',
                    content: '[{\"type\": \"category\", \"name\": \"General\", \"channels\": [{\"type\": \"text\", \"name\": \"general-chat\", \"description\": \"General chat for all topics.\"}, {\"type\": \"voice\", \"name\": \"voice-chat\", \"description\": \"Voice chat for gaming sessions.\"}, {\"type\": \"text\", \"name\": \"announcements\", \"description\": \"Important announcements and updates.\"}]}, {\"type\": \"category\", \"name\": \"Game Discussions\", \"channels\": [{\"type\": \"text\", \"name\": \"game-news\", \"description\": \"Latest news and updates about the game.\"}, {\"type\": \"text\", \"name\": \"strategy-discussion\", \"description\": \"Discuss strategies and tactics.\"}, {\"type\": \"voice\", \"name\": \"game-voice-chat\", \"description\": \"Voice chat dedicated to game sessions.\"}]}]',
                    name: 'example_assistant'
                },
                {
                    role: 'user',
                    content: 'Can you please add a channel for announcements?',
                    name: 'example_user'
                },
                {
                    role: 'assistant',
                    content: '[{\"type\": \"category\", \"name\": \"General\", \"channels\": [{\"type\": \"text\", \"name\": \"general-chat\", \"description\": \"General chat for all topics.\"}, {\"type\": \"voice\", \"name\": \"voice-chat\", \"description\": \"Voice chat for gaming sessions.\"}, {\"type\": \"text\", \"name\": \"announcements\", \"description\": \"Important announcements and updates.\"}]}, {\"type\": \"category\", \"name\": \"Game Discussions\", \"channels\": [{\"type\": \"text\", \"name\": \"game-news\", \"description\": \"Latest news and updates about the game.\"}, {\"type\": \"text\", \"name\": \"strategy-discussion\", \"description\": \"Discuss strategies and tactics.\"}, {\"type\": \"voice\", \"name\": \"game-voice-chat\", \"description\": \"Voice chat dedicated to game sessions.\"}]}]',
                    name: 'example_assistant'
                },
                {
                    role: 'system',
                    content: 'Great! Now you are ready to setup channels for a server. Do not forget, YOU WILL ONLY RESPOND WITH ARRAY OF CHANNELS. NOT WITH ANYTHING ELSE. And you will use your creativity to setup channels for a server.'
                },
                {
                    role: 'user',
                    content: `Prompt to setup channels:\n${prompt}`
                }
            ];
            let response = await request({
                url: 'https://beta.purgpt.xyz/openai/chat/completions',
                method: RequestMethod.Post,
                body: {
                    model: 'gpt-4-32k',
                    messages,
                    fallbacks: ['gpt-4', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo']
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                }
            });

            if (!response.ok) {
                response = await request({
                    url: 'https://beta.purgpt.xyz/purgpt/chat/completions',
                    method: RequestMethod.Post,
                    body: {
                        model: 'vicuna-7b-v1.5-16k',
                        messages,
                        fallbacks: ['pur-001', 'pur-rp']
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                    }
                });
            };
            if (!response.ok) return interaction.editReply(localize(locale, 'MODELS_DOWN'));

            let message = response.body.choices[0].message;

            messages.push(message);

            let channels;

            try {
                let matched = message.content.match(/\[[^\[\]]*?(?:\[[^\[\]]*?\][^\[\]]*?)*\]/g)[0];

                console.log(matched);

                channels = JSON.parse(matched);
            } catch (error) {
                console.log(prompt, message.content);

                return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));
            };

            if (!Array.isArray(channels)) return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));

            await interaction.editReply({
                embeds: [
                    new EmbedMaker(interaction.client)
                        .setTitle('Channels')
                        .setDescription(channels.map(channel => `- ${channel.type === 'category' ? emojis.categoryChannel : channel.type === 'text' ? emojis.textChannel : channel.type === 'voice' ? emojis.voiceChannel : channel.type === 'forum' ? emojis.forumChannel : channel.type === 'announcement' ? emojis.announcementChannel : emojis.stageChannel} ${channel.name}${channel.type === 'category' ? `\n${channel.channels.map(subchannel => `  - ${subchannel.type === 'text' ? emojis.textChannel : subchannel.type === 'voice' ? emojis.voiceChannel : subchannel.type === 'forum' ? emojis.forumChannel : subchannel.type === 'announcement' ? emojis.announcementChannel : emojis.stageChannel} ${subchannel.name}`).join('\n')}` : ''}`).join('\n')),
                    ...(debug ? [
                        new EmbedMaker(interaction.client)
                            .setTitle('Debug')
                            .setFields(
                                {
                                    name: 'Model',
                                    value: response.body.model ?? 'Unknown',
                                    inline: true
                                },
                                {
                                    name: 'Provider',
                                    value: response.body.provider ?? 'Unknown',
                                    inline: true
                                }
                            )
                    ]
                        : [])
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            new ButtonBuilder()
                                .setCustomId('setup')
                                .setEmoji(emojis.update)
                                .setLabel(localize(locale, 'SETUP_CHANNELS'))
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('follow-up')
                                .setEmoji(emojis.send)
                                .setLabel(localize(locale, 'FOLLOW_UP'))
                                .setStyle(ButtonStyle.Secondary)
                        )
                ]
            });

            const collector = new InteractionCollector(interaction.client, {
                message: reply.id,
                idle: 300000,
                filter: int => int.user.id === interaction.user.id
            });

            collector.on('collect', async int => {
                if (int.customId === 'follow-up') int.showModal(
                    new ModalBuilder()
                        .setCustomId('follow-up-modal')
                        .setTitle('Follow Up')
                        .setComponents(
                            new ActionRowBuilder()
                                .setComponents(
                                    new TextInputBuilder()
                                        .setCustomId('message')
                                        .setLabel('Message')
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Paragraph)
                                )
                        )
                ).catch(() => null);
                else if (int.customId === 'follow-up-modal') {
                    await int.deferUpdate().catch(() => int.reply(localize(locale, 'SENDING_FOLLOW_UP')).catch(() => int.editReply(localize(locale, 'SENDING_FOLLOW_UP')).catch(() => null)));
                    await interaction.editReply({
                        content: ''
                    });

                    let message = int.fields.getTextInputValue('message');

                    messages.push({
                        role: 'system',
                        content: 'Do not forget, YOU WILL ONLY RESPOND WITH ARRAY OF CHANNELS. NOT WITH ANYTHING ELSE. And you will use your creativity to setup channels for a server.'
                    });
                    messages.push({
                        role: 'user',
                        content: message
                    });

                    let response = await request({
                        url: 'https://beta.purgpt.xyz/openai/chat/completions',
                        method: RequestMethod.Post,
                        body: {
                            model: 'gpt-4-32k',
                            messages,
                            fallbacks: ['gpt-4', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo']
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                        }
                    }, {
                        isNotOk: (response) => console.log(response.body, response.status)
                    });

                    if (!response.ok) {
                        response = await request({
                            url: 'https://beta.purgpt.xyz/purgpt/chat/completions',
                            method: RequestMethod.Post,
                            body: {
                                model: 'vicuna-7b-v1.5-16k',
                                messages,
                                fallbacks: ['pur-001', 'pur-rp']
                            },
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                            }
                        }, {
                            isNotOk: (response) => console.log(response.body)
                        });
                    };
                    if (!response.ok) return interaction.editReply(localize(locale, 'MODELS_DOWN'));

                    let responseMessage = response.body.choices[0].message;

                    try {
                        channels = JSON.parse(responseMessage.content);

                        messages.push(responseMessage);
                    } catch (error) {
                        try {
                            let matched = responseMessage.content.match(/\[[^\[\]]*?(?:\[[^\[\]]*?\][^\[\]]*?)*\]/g)[0];

                            channels = JSON.parse(matched);

                            messages.push({
                                role: 'assistant',
                                content
                            });
                        } catch (error) {
                            console.log(responseMessage.content)

                            return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));
                        };
                    };

                    if (!Array.isArray(channels)) {
                        messages.pop();
                        messages.pop();

                        return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));
                    };

                    await interaction.editReply({
                        embeds: [
                            new EmbedMaker(interaction.client)
                                .setTitle('Channels')
                                .setDescription(channels.map(channel => `- ${channel.type === 'category' ? emojis.categoryChannel : channel.type === 'text' ? emojis.textChannel : channel.type === 'voice' ? emojis.voiceChannel : channel.type === 'forum' ? emojis.forumChannel : channel.type === 'announcement' ? emojis.announcementChannel : emojis.stageChannel} ${channel.name}${channel.type === 'category' ? `\n${channel.channels.map(subchannel => `  - ${subchannel.type === 'text' ? emojis.textChannel : subchannel.type === 'voice' ? emojis.voiceChannel : subchannel.type === 'forum' ? emojis.forumChannel : subchannel.type === 'announcement' ? emojis.announcementChannel : emojis.stageChannel} ${subchannel.name}`).join('\n')}` : ''}`).join('\n')),
                            ...(debug ? [
                                new EmbedMaker(interaction.client)
                                    .setTitle('Debug')
                                    .setFields(
                                        {
                                            name: 'Model',
                                            value: response.body.model ?? 'Unknown',
                                            inline: true
                                        },
                                        {
                                            name: 'Provider',
                                            value: response.body.provider ?? 'Unknown',
                                            inline: true
                                        }
                                    )
                            ]
                                : [])
                        ]
                    });
                } else if (int.customId === 'setup') {
                    await int.deferUpdate().catch(() => int.reply(localize(locale, 'SETTING_UP_CHANNELS')).catch(() => int.editReply(localize(locale, 'SETTING_UP_CHANNELS'))));

                    for (let channel of channels) {
                        if (!channel.type || !channel.name || !['category', 'text', 'voice', 'forum', 'announcement', 'stage'].includes(channel.type)) return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));

                        if (channel.type === 'category') {
                            let category = await interaction.guild.channels.create({
                                type: ChannelType.GuildCategory,
                                name: channel.name
                            });

                            for (let subchannel of channel.channels) {
                                if (!subchannel.type || !subchannel.name || !['text', 'voice', 'forum', 'announcement', 'stage'].includes(subchannel.type)) return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));

                                let communityServer = interaction.guild.features.includes(GuildFeature.Community);

                                await interaction.guild.channels.create({
                                    name: subchannel.name,
                                    type: subchannel.type === 'text' ? ChannelType.GuildText : subchannel.type === 'voice' ? ChannelType.GuildVoice : subchannel.type === 'forum' ? communityServer ? ChannelType.GuildForum : ChannelType.GuildText : subchannel.type === 'announcement' ? communityServer ? ChannelType.GuildAnnouncement : ChannelType.GuildText : communityServer ? ChannelType.GuildStageVoice : ChannelType.GuildVoice,
                                    parent: category.id,
                                    topic: subchannel.description
                                });

                                await new Promise(resolve => setTimeout(resolve, 1000));
                            };
                        } else await interaction.guild.channels.create({
                            name: channel.name,
                            type: channel.type === 'text' ? ChannelType.GuildText : channel.type === 'voice' ? ChannelType.GuildVoice : channel.type === 'forum' ? ChannelType.GuildForum : channel.type === 'announcement' ? (interaction.guild.features.includes(GuildFeature.Community) ? ChannelType.GuildAnnouncement : ChannelType.GuildText) : ChannelType.GuildStageVoice,
                            topic: channel.description
                        });

                        await new Promise(resolve => setTimeout(resolve, 1000));
                    };

                    await interaction.editReply({
                        content: localize(locale, 'CHANNELS_SETUP'),
                        components: [],
                        embeds: []
                    });
                };
            });
        } else if (subcommand === 'setup-roles') {
            if (!interaction.appPermissions.has('ManageRoles')) return interaction.editReply(localize(locale, 'MISSING_PERMISSION', 'Manage Roles'));

            let prompt = interaction.options.getString('prompt') ?? 'Generate me some server roles.';
            let debug = interaction.options.getBoolean('debug') ?? false;
            let messages = [
                {
                    role: 'system',
                    content: `You are Server Wizard. You will setup roles for a Discord server. Role permissions must be bitwise. You can set the permissions to "default" to use default permissions. You will respond with array of roles like this:\n[{ "name" : "Example Role 1", "color": "ff0000", "icon": "2378643345346" // example icon id, "hoist": true, "mentionable": true, "permissions": 8 }, { "name" : "Example Role 2", "color": "ff0000", "icon": "😜" // example unicode icon, "hoist": true, "mentionable": true, "permissions": "default" }]`
                },
                {
                    role: 'system',
                    content: "Let's do some practice."
                },
                {
                    role: 'user',
                    content: `Prompt to setup roles:\nCreate a gaming server with at least 5 roles\n\nAvailable Custom Role Icons:\n- SnowAngel: 1049608236979986483\n- HappyGraggle: 1049608548654514226\n`,
                    name: 'example_user'
                },
                {
                    role: 'assistant',
                    content: '[{ \"name\" : \"Admin\", \"color\": \"ff0000\", \"icon\": \"1049608236979986483\", \"hoist\": true, \"mentionable\": true, \"permissions\": 2147483647 }, \n{ \"name\" : \"Moderator\", \"color\": \"00ff00\", \"icon\": \"1049608548654514226\n\", \"hoist\": true, \"mentionable\": true, \"permissions\": 8192 }, \n{ \"name\" : \"Member\", \"color\": \"0000ff\", \"icon\": \"🎮\", \"hoist\": false, \"mentionable\": false, \"permissions\": 104324673 }, \n{ \"name\" : \"Newbie\", \"color\": \"ffff00\", \"icon\": \"👾\", \"hoist\": false, \"mentionable\": false, \"permissions\": 104324673 }, \n{ \"name\" : \"Guest\", \"color\": \"808080\", \"icon\": \"🎲\", \"hoist\": false, \"mentionable\": false, \"permissions\": 104324673 }]',
                    name: 'example_assistant'
                },
                {
                    role: 'user',
                    content: 'Can you please add a role for VIP members?',
                    name: 'example_user'
                },
                {
                    role: 'assistant',
                    content: '[{ \"name\" : \"Admin\", \"color\": \"ff0000\", \"icon\": \"3285793523\", \"hoist\": true, \"mentionable\": true, \"permissions\": 2147483647 }, \n{ \"name\" : \"Moderator\", \"color\": \"00ff00\", \"icon\": \"4758238956\", \"hoist\": true, \"mentionable\": true, \"permissions\": 8192 }, \n{ \"name\" : \"Member\", \"color\": \"0000ff\", \"icon\": \"🎮\", \"hoist\": false, \"mentionable\": false, \"permissions\": 104324673 }, \n{ \"name\" : \"Newbie\", \"color\": \"ffff00\", \"icon\": \"👾\", \"hoist\": false, \"mentionable\": false, \"permissions\": 104324673 }, \n{ \"name\" : \"Guest\", \"color\": \"808080\", \"icon\": \"🎲\", \"hoist\": false, \"mentionable\": false, \"permissions\": 104324673 }, \n{ \"name\" : \"VIP\", \"color\": \"ff00ff\", \"icon\": \"👑\", \"hoist\": false, \"mentionable\": false, \"permissions\": 104324673 }]',
                    name: 'example_assistant'
                },
                {
                    role: 'system',
                    content: 'Great! Now you are ready to setup channels for a server. Do not forget, YOU WILL ONLY RESPOND WITH ARRAY OF CHANNELS. NOT WITH ANYTHING ELSE. And you will use your creativity to setup roles for a server, especially for role names and colors. You do not have to create a role for each available icon.\n\nYOU WILL NOT USE ICON NAME FOR ICON ID. YOU WILL ONLY USE ICON ID OR UNICODE EMOJI. You have to put an icon for each role.'
                },
                {
                    role: 'user',
                    content: `Prompt to setup channels:\n${prompt}\n\nAvailable Custom Role Icons:\n${interaction.guild.emojis.cache.size === 0 ? 'None. You can just use unicode emojis for that.' : interaction.guild.emojis.cache.map(emoji => `- ${emoji.name}: ${emoji.id}`).join('\n')}`
                }
            ];
            let response = await request({
                url: 'https://beta.purgpt.xyz/openai/chat/completions',
                method: RequestMethod.Post,
                body: {
                    model: 'gpt-4-32k',
                    messages,
                    fallbacks: ['gpt-4', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo']
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                }
            }, {
                isOk: (response) => console.log(JSON.stringify(response.body, null, 2)),
                isNotOk: (response) => console.log(response.body, response.status)
            });

            if (!response.ok) {
                response = await request({
                    url: 'https://beta.purgpt.xyz/purgpt/chat/completions',
                    method: RequestMethod.Post,
                    body: {
                        model: 'vicuna-7b-v1.5-16k',
                        messages,
                        fallbacks: ['pur-001', 'pur-rp']
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                    }
                });
            };
            if (!response.ok) return interaction.editReply(localize(locale, 'MODELS_DOWN'));

            let message = response.body.choices[0].message;

            messages.push(message);

            let roles;

            try {
                let matched = message.content.match(/\[[^\[\]]*?(?:\[[^\[\]]*?\][^\[\]]*?)*\]/g)[0];

                console.log(matched);

                roles = JSON.parse(matched);
                roles = roles.slice(0, 25);
            } catch (error) {
                console.log(prompt, message.content);

                return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));
            };

            if (!Array.isArray(roles)) return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));

            await interaction.editReply({
                embeds: [
                    new EmbedMaker(interaction.client)
                        .setTitle('Roles')
                        .setDescription(roles.map(role => {
                            let isUnicode = /[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/u.test(role.icon);
                            let permissions = localize(locale, 'DEFAULT');

                            if (permissions !== 'default') {
                                try {
                                    permissions = new PermissionsBitField(role.permissions).toArray();
                                } catch (error) {
                                };
                            };

                            if (!isUnicode && !interaction.guild.emojis.cache.has(role.icon)) role.icon = '✨';

                            isUnicode = /[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/u.test(role.icon);

                            return `- ${isUnicode ? role.icon : `<:role_icon:${role.icon}>`} ${role.name}\n  - **${localize(locale, 'COLOR')}:** [#${role.color}](https://www.thecolorapi.com/id?hex=${role.color.toUpperCase()}&format=svg)\n  - **${localize(locale, 'HOIST')}:** ${role.hoist ? 'Enabled' : 'Disabled'}\n  - **${localize(locale, 'MENTIONABLE')}:** ${role.mentionable ? 'Enabled' : 'Disabled'}\n  - **${localize(locale, 'PERMISSIONS')}:** ${permissions ?? localize(locale, 'DEFAULT')}`;
                        }).join('\n')),
                    ...(debug ? [
                        new EmbedMaker(interaction.client)
                            .setTitle('Debug')
                            .setFields(
                                {
                                    name: 'Model',
                                    value: response.body.model ?? 'Unknown',
                                    inline: true
                                },
                                {
                                    name: 'Provider',
                                    value: response.body.provider ?? 'Unknown',
                                    inline: true
                                }
                            )
                    ]
                        : [])
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            new ButtonBuilder()
                                .setCustomId('setup')
                                .setEmoji(emojis.update)
                                .setLabel(localize(locale, 'SETUP_ROLES'))
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('follow-up')
                                .setEmoji(emojis.send)
                                .setLabel(localize(locale, 'FOLLOW_UP'))
                                .setStyle(ButtonStyle.Secondary)
                        )
                ]
            });

            const collector = new InteractionCollector(interaction.client, {
                message: reply.id,
                idle: 300000,
                filter: int => int.user.id === interaction.user.id
            });

            collector.on('collect', async int => {
                if (int.customId === 'follow-up') int.showModal(
                    new ModalBuilder()
                        .setCustomId('follow-up-modal')
                        .setTitle('Follow Up')
                        .setComponents(
                            new ActionRowBuilder()
                                .setComponents(
                                    new TextInputBuilder()
                                        .setCustomId('message')
                                        .setLabel('Message')
                                        .setRequired(true)
                                        .setStyle(TextInputStyle.Paragraph)
                                )
                        )
                ).catch(() => null);
                else if (int.customId === 'follow-up-modal') {
                    await int.deferUpdate().catch(() => int.reply(localize(locale, 'SENDING_FOLLOW_UP')).catch(() => int.editReply(localize(locale, 'SENDING_FOLLOW_UP')).catch(() => null)));
                    await interaction.editReply({
                        content: ''
                    });

                    let message = int.fields.getTextInputValue('message');

                    messages.push({
                        role: 'system',
                        content: 'Do not forget, YOU WILL ONLY RESPOND WITH ARRAY OF ROLES. NOT WITH ANYTHING ELSE. And you will use your creativity to setup roles for a server.'
                    });
                    messages.push({
                        role: 'user',
                        content: message
                    });

                    let response = await request({
                        url: 'https://beta.purgpt.xyz/openai/chat/completions',
                        method: RequestMethod.Post,
                        body: {
                            model: 'gpt-4-32k',
                            messages,
                            fallbacks: ['gpt-4', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo']
                        },
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                        }
                    }, {
                        isOk: (response) => console.log(JSON.stringify(response.body, null, 2)),
                        isNotOk: (response) => console.log(response.body, response.status)
                    });

                    if (!response.ok) {
                        response = await request({
                            url: 'https://beta.purgpt.xyz/purgpt/chat/completions',
                            method: RequestMethod.Post,
                            body: {
                                model: 'vicuna-7b-v1.5-16k',
                                messages,
                                fallbacks: ['pur-001', 'pur-rp']
                            },
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                            }
                        }, {
                            isNotOk: (response) => console.log(response.body)
                        });
                    };
                    if (!response.ok) return interaction.editReply(localize(locale, 'MODELS_DOWN'));

                    let responseMessage = response.body.choices[0].message;

                    try {
                        roles = JSON.parse(responseMessage.content);
                        roles = roles.slice(0, 25);

                        messages.push(responseMessage);
                    } catch (error) {
                        try {
                            let matched = responseMessage.content.match(/\[[^\[\]]*?(?:\[[^\[\]]*?\][^\[\]]*?)*\]/g)[0];

                            roles = JSON.parse(matched);
                            roles = roles.slice(0, 25);

                            messages.push({
                                role: 'assistant',
                                content
                            });
                        } catch (error) {
                            console.log(responseMessage.content)

                            return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));
                        };
                    };

                    if (!Array.isArray(roles)) {
                        messages.pop();
                        messages.pop();

                        return interaction.editReply(localize(locale, 'INVALID_RESPONSE'));
                    };

                    await interaction.editReply({
                        embeds: [
                            new EmbedMaker(interaction.client)
                                .setTitle('Roles')
                                .setDescription(roles.map(role => {
                                    let isUnicode = /[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/u.test(role.icon);
                                    let permissions = 'Default';

                                    if (role.permissions !== 'default') {
                                        try {
                                            permissions = new PermissionsBitField(role.permissions).toArray();
                                        } catch (error) {
                                        };
                                    };

                                    if (!isUnicode && !interaction.guild.emojis.cache.has(role.icon)) role.icon = '✨';

                                    isUnicode = /[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/u.test(role.icon);

                                    return `- ${isUnicode ? role.icon : `<:role_icon:${role.icon}>`} ${role.name}\n  - **Color:** [#${role.color}](https://www.thecolorapi.com/id?hex=${role.color.toUpperCase()}&format=svg)\n  - **Hoist:** ${role.hoist ? 'Enabled' : 'Disabled'}\n  - **Mentionable:** ${role.mentionable ? 'Enabled' : 'Disabled'}\n  - **Permissions:** ${permissions ?? 'Default'}`;
                                }).join('\n')),
                            ...(debug ? [
                                new EmbedMaker(interaction.client)
                                    .setTitle('Debug')
                                    .setFields(
                                        {
                                            name: 'Model',
                                            value: response.body.model ?? 'Unknown',
                                            inline: true
                                        },
                                        {
                                            name: 'Provider',
                                            value: response.body.provider ?? 'Unknown',
                                            inline: true
                                        }
                                    )
                            ]
                                : [])
                        ]
                    });
                } else if (int.customId === 'setup') {
                    await int.deferUpdate().catch(() => int.reply(localize(locale, 'SETTING_UP_CHANNELS')).catch(() => int.editReply(localize(locale, 'SETTING_UP_CHANNELS'))));

                    for (let role of roles) {
                        let permissions;

                        if (role.permissions !== 'default') {
                            try {
                                permissions = new PermissionsBitField(role.permissions).toArray();
                            } catch (error) {
                            };
                        };

                        let isUnicode = /[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}]/u.test(role.icon);

                        await interaction.guild.roles.create({
                            name: role.name,
                            color: role.color,
                            hoist: role.hoist ?? false,
                            mentionable: role.mentionable ?? false,
                            permissions: permissions,
                            icon: [GuildPremiumTier.Tier2, GuildPremiumTier.Tier3].includes(interaction.guild.premiumTier) ? isUnicode ? role.icon : interaction.guild.emojis.cache.has(role.icon) ? role.icon : '✨' : null
                        });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    };

                    await interaction.editReply({
                        content: localize(locale, 'ROLES_SETUP'),
                        components: [],
                        embeds: []
                    });
                };
            });
        };
    }
};