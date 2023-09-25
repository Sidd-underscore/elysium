const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('privacy')
        .setDescription('Manage your privacy settings')
        .setDescriptionLocalizations({
            tr: 'Gizlilik ayarlarınızı yönetin'
        })
        .addSubcommandGroup(group => group
            .setName('chat-history-saving')
            .setNameLocalizations({
                tr: 'sohbet-geçmişi-kaydetme'
            })
            .setDescription('Manage your chat history saving settings')
            .setDescriptionLocalizations({
                tr: 'Sohbet geçmişi kaydetme ayarlarınızı yönetin'
            })
            .addSubcommand(subcommand => subcommand
                .setName('toggle')
                .setNameLocalizations({
                    tr: 'aç-kapat'
                })
                .setDescription('Toggle your chat history saving settings')
                .setDescriptionLocalizations({
                    tr: 'Sohbet geçmişi kaydetme ayarlarınızı açıp kapatın'
                })
                .addBooleanOption(option => option
                    .setName('status')
                    .setNameLocalizations({
                        tr: 'durum'
                    })
                    .setDescription('The status of your chat history saving settings')
                    .setDescriptionLocalizations({
                        tr: 'Sohbet geçmişi kaydetme ayarlarınızın durumu'
                    })
                    .setRequired(true)
                )
            )
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let locale = interaction.locale;
        let group = interaction.options.getSubcommandGroup();
        let subcommand = interaction.options.getSubcommand();

        if (group === 'chat-history-saving') {
            if (subcommand === 'toggle') {
                let status = interaction.options.getBoolean('status');

                await db.set(`users.${interaction.user.id}.saveChatHistory`, status);

                interaction.editReply(localize(locale, 'CHAT_HISTORY_SAVING_STATUS_SET'))
            };
        };
    }
};