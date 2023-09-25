const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('usage')
        .setNameLocalizations({
            tr: 'kullanım'
        })
        .setDescription('Shows your remaining usage')
        .setDescriptionLocalizations({
            tr: 'Kalan kullanımınızı gösterir'
        }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let user = await db.get(`users.${interaction.user.id}`);

        interaction.editReply(localize(interaction.locale, 'USAGE', user?.usage ?? 0, user?.premium ? '∞' : 25));
    }
};