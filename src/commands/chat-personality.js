const { SlashCommandBuilder, ChatInputCommandInteraction, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, InteractionCollector, InteractionType } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const { request, RequestMethod } = require("fetchu.js");
const { defaultPersonality } = require("../../config");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('chat-personality')
        .setNameLocalizations({
            tr: 'sohbet-karakteri'
        })
        .setDescription('Set the chat personality of the bot.')
        .setDescriptionLocalizations({
            tr: 'Botun sohbet karakterini ayarlar.'
        })
        .addSubcommand(subcommand => subcommand
            .setName('set')
            .setNameLocalizations({
                tr: 'ayarla'
            })
            .setDescription('Set the chat personality of the bot.')
            .setDescriptionLocalizations({
                tr: 'Botun sohbet karakterini ayarlar.'
            })
            .addStringOption(option => option
                .setName('personality')
                .setNameLocalizations({
                    tr: 'karakter'
                })
                .setDescription('The chat personality you want to set.')
                .setDescriptionLocalizations({
                    tr: 'Ayarlamak istediğiniz sohbet karakteri.'
                })
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('create')
            .setNameLocalizations({
                tr: 'oluştur'
            })
            .setDescription('Create a new chat personality.')
            .setDescriptionLocalizations({
                tr: 'Yeni bir sohbet karakteri oluşturur.'
            })
            .addBooleanOption(option => option
                .setName('dm-only')
                .setNameLocalizations({
                    tr: 'dm-özel'
                })
                .setDescription('Should the chat personality be DM only? (default: false)')
                .setDescriptionLocalizations({
                    tr: 'Sohbet karakteri yalnızca DM\'lerde mi olmalı? (varsayılan: false)'
                })
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('edit')
            .setNameLocalizations({
                tr: 'düzenle'
            })
            .setDescription('Edits a chat personality.')
            .setDescriptionLocalizations({
                tr: 'Bir sohbet karakterini düzenler.'
            })
            .addStringOption(option => option
                .setName('personality')
                .setNameLocalizations({
                    tr: 'karakter'
                })
                .setDescription('The chat personality you want to edit.')
                .setDescriptionLocalizations({
                    tr: 'Düzenlemek istediğiniz sohbet karakteri.'
                })
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addBooleanOption(option => option
                .setName('dm-only')
                .setNameLocalizations({
                    tr: 'dm-özel'
                })
                .setDescription('Should the chat personality be DM only? (default: false)')
                .setDescriptionLocalizations({
                    tr: 'Sohbet karakteri yalnızca DM\'lerde mi olmalı? (varsayılan: false)'
                })
                .setRequired(false)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('delete')
            .setNameLocalizations({
                tr: 'sil'
            })
            .setDescription('Deletes a chat personality.')
            .setDescriptionLocalizations({
                tr: 'Bir sohbet karakterini siler.'
            })
            .addStringOption(option => option
                .setName('personality')
                .setNameLocalizations({
                    tr: 'karakter'
                })
                .setDescription('The chat personality you want to delete.')
                .setDescriptionLocalizations({
                    tr: 'Silmek istediğiniz sohbet karakteri.'
                })
                .setRequired(true)
                .setAutocomplete(true)
            )
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        let locale = interaction.locale;
        let subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            await interaction.deferReply({ ephemeral: true });

            let personality = interaction.options.getString('personality');

            await db.set(`users.${interaction.user.id}.personality`, personality);

            interaction.editReply(localize(locale, 'CHAT_PERSONALITY_SET'));
        } else if (subcommand === 'create') {
            let dmOnly = interaction.options.getBoolean('dm-only') ?? false;

            interaction.showModal(
                new ModalBuilder()
                    .setCustomId('chat-personality-create')
                    .setTitle(localize(locale, 'CREATE_CHAT_PERSONALITY'))
                    .setComponents(
                        new ActionRowBuilder()
                            .setComponents(
                                new TextInputBuilder()
                                    .setCustomId('name')
                                    .setLabel(localize(locale, 'PERSONALITY_NAME'))
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                                    .setMaxLength(50)
                            ),
                        new ActionRowBuilder()
                            .setComponents(
                                new TextInputBuilder()
                                    .setCustomId('personality')
                                    .setLabel(localize(locale, 'PERSONALITY_DESCRIPTION'))
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(true)
                                    .setMinLength(10)
                                    .setValue(defaultPersonality)
                            )
                    )
            );

            const collector = new InteractionCollector(interaction.client, {
                interactionType: InteractionType.ModalSubmit,
                filter: int => int.user.id === interaction.user.id,
                time: 300000
            });

            collector.on('collect', async int => {
                await int.deferReply({ ephemeral: true });

                let name = int.fields.getTextInputValue('name');
                let personality = int.fields.getTextInputValue('personality');
                let id = name.toLowerCase().replaceAll(' ', '-')
                let response = await request({
                    url: 'https://api.openai.com/v1/moderations',
                    method: RequestMethod.Post,
                    body: {
                        model: 'text-moderation-stable',
                        input: personality
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                    }
                });

                let nsfw = response.body?.results?.[0]?.flagged ?? false;

                await db.set(`users.${interaction.user.id}.personalities.${id}`, {
                    id,
                    name,
                    description: personality,
                    nsfw,
                    dmOnly
                });

                int.editReply(localize(locale, 'CHAT_PERSONALITY_CREATED')).catch(() => null);
            });
        } else if (subcommand === 'delete') {
            await interaction.deferReply({ ephemeral: true });

            let personality = interaction.options.getString('personality');

            await db.delete(`users.${interaction.user.id}.personalities.${personality}`);

            interaction.editReply(localize(locale, 'CHAT_PERSONALITY_DELETED'));
        } else if (subcommand === 'edit') {
            let personalityId = interaction.options.getString('personality');
            let dmOnly = interaction.options.getBoolean('dm-only');

            if (personalityId === 'elysium') return interaction.reply({
                content: localize(locale, 'CANNOT_EDIT_PERSONALITY'),
                ephemeral: true
            });

            let personalityData = await db.get(`users.${interaction.user.id}.personalities.${personalityId}`);

            if (!personalityData) return interaction.reply({
                content: localize(locale, 'NOT_FOUND', localize(locale, 'CHAT_PERSONALITY')),
                ephemeral: true
            });
            if (dmOnly === undefined) dmOnly = personalityData.dmOnly;

            interaction.showModal(
                new ModalBuilder()
                    .setCustomId('chat-personality-edit')
                    .setTitle(localize(locale, 'EDIT_CHAT_PERSONALITY'))
                    .setComponents(
                        new ActionRowBuilder()
                            .setComponents(
                                new TextInputBuilder()
                                    .setCustomId('name')
                                    .setLabel(localize(locale, 'PERSONALITY_NAME'))
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                                    .setMaxLength(50)
                                    .setValue(personalityData.name)
                            ),
                        new ActionRowBuilder()
                            .setComponents(
                                new TextInputBuilder()
                                    .setCustomId('personality')
                                    .setLabel(localize(locale, 'PERSONALITY_DESCRIPTION'))
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(true)
                                    .setMinLength(10)
                                    .setValue(personalityData.description)
                            )
                    )
            );

            const collector = new InteractionCollector(interaction.client, {
                interactionType: InteractionType.ModalSubmit,
                filter: int => int.user.id === interaction.user.id,
                time: 300000
            });

            collector.on('collect', async int => {
                await int.deferReply({ ephemeral: true }).catch(() => null);

                let name = int.fields.getTextInputValue('name');
                let personality = int.fields.getTextInputValue('personality');
                let response = await request({
                    url: 'https://api.openai.com/v1/moderations',
                    method: RequestMethod.Post,
                    body: {
                        model: 'text-moderation-stable',
                        input: personality
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                    }
                });

                let nsfw = response.body?.results?.[0]?.flagged ?? false;

                console.log('NSFW', nsfw);

                await db.set(`users.${interaction.user.id}.personalities.${personalityId}`, {
                    id: personalityId,
                    name,
                    description: personality,
                    nsfw,
                    dmOnly
                });

                int.editReply(localize(locale, 'CHAT_PERSONALITY_EDITED'));
            });
        };
    }
};