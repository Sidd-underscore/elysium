const { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const EmbedMaker = require("../modules/embed");
const { localize } = require("../modules/localization");
const { emojis } = require("../../config");
const { QuickDB } = require("quick.db");
const { randomItem } = require("@tolga1452/toolbox.js");
const { ads } = require("../../config");

const db = new QuickDB();

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
        let user = await db.get(`users.${interaction.user.id}`) ?? {
            tier: 0,
            bonus: 0,
            usage: 0,
            imageEdits: false,
            gpt4: false,
            gifts: []
        };

        let adsMessage = randomItem(ads);

        interaction.editReply({
            content: user.tier >= 2 ? null : `**ADS (buy premium to remove):** ${adsMessage}\nContact **[@tolgchu](discord://-/users/329671025312923648)** to advertise here.`,
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
