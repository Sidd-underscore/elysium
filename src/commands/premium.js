const { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const EmbedMaker = require("../modules/embed");
const { localize } = require("../modules/localization");
const { emojis } = require("../../config");

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription("Shows information about the premium")
    .setDescriptionLocalizations({
        tr: 'Premium hakkında bilgi gösterir'
    }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let locale = interaction.locale;
        let isInDEH = await interaction.client.guilds.cache.get('1089540433010491392').members.fetch(interaction.user.id).catch(() => null) !== null;

        interaction.editReply({
            embeds: [
                new EmbedMaker(interaction.client)
                .setTitle(`${emojis.premium} Premium`)
                .setDescription(localize(locale, 'TIER_LIST'))
                .setFields(
                    {
                        name: localize(locale, 'SHOULD_I_DO_ANYTHING'),
                        value: localize(locale, 'CONTACT_TOLGCHU')
                    }
                )
            ]
        });
    }
};