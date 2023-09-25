const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
    .setName('reset-chat-history')
    .setNameLocalizations({
        tr: 'sohbet-geçmişini-sıfırla'
    })
    .setDescription('Resets your chat history of your current personality')
    .setDescriptionLocalizations({
        tr: 'Mevcut karakterinizin sohbet geçmişini sıfırlar'
    }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let locale = interaction.locale;
        let user = await db.get(`users.${interaction.user.id}`) ?? {};
        let personality = user.personality ?? 'elysium';
        
        await db.set(`users.${interaction.user.id}.chats.${personality}`, []);

        await interaction.editReply(localize(locale, 'CHAT_HISTORY_RESET'));
    }
};