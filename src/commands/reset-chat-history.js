const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const { randomItem } = require("@tolga1452/toolbox.js");
const { ads } = require("../../config");

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

        let adsMessage = randomItem(ads);

        await interaction.editReply(`${localize(locale, 'CHAT_HISTORY_RESET')}${user.tier >= 2 ? null : `\n**ADS (buy premium to remove):** ${adsMessage}\nContact with **[@tolgchu](discord://-/users/329671025312923648)** to add your ad here.`}`);
    }
};