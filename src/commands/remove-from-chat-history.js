const { SlashCommandBuilder, ChatInputCommandInteraction, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, MessageContextMenuCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new ContextMenuCommandBuilder()
        .setType(ApplicationCommandType.Message)
        .setName('Remove From Chat History')
        .setNameLocalizations({
            tr: 'Sohbet Geçmişinden Kaldır'
        }),
    /**
     * @param {MessageContextMenuCommandInteraction} interaction 
     */
    async execute(interaction) {
        let locale = interaction.locale;

        if (interaction.guild) return interaction.reply({
            content: localize(locale, 'COMMAND_DM_ONLY'),
            ephemeral: true
        });
        if (interaction.targetMessage.author.id !== interaction.user.id) return interaction.reply({
            content: localize(locale, 'ONLY_USER_MESSAGES'),
            ephemeral: true
        });

        await interaction.deferReply({ ephemeral: true });

        let user = await db.get(`users.${interaction.user.id}`) ?? {};
        let personality = user?.personality ?? 'elysium';
        let chat = user?.chats?.[personality] ?? [];

        await db.set(`users.${interaction.user.id}.chats.${personality}`, chat.filter(message => message.messageId !== interaction.targetId));

        interaction.editReply(localize(locale, 'MESSAGE_REMOVED'));
    }
};