const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
    .setName('training-mode')
    .setNameLocalizations({
        tr: 'eğitim-modu'
    })
    .setDescription('Toggles training mode. If training mode is enabled, the bot will save your ALL messages.')
    .setDescriptionLocalizations({
        tr: 'Eğitim modunu açar/kapatır. Eğitim modu açıkken bot TÜM mesajlarınızı kaydedecektir.'
    }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let enabled = await db.get(`training.${interaction.user.id}`);

        await db.set(`training.${interaction.user.id}`, !enabled);

        interaction.editReply(`Training mode is now ${!enabled ? 'enabled' : 'disabled'}!`);
    }
};