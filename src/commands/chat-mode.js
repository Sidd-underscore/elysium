const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('chat-mode')
        .setNameLocalizations({
            tr: 'sohbet-modu'
        })
        .setDescription('Sets your chat mode.')
        .setDescriptionLocalizations({
            tr: 'Sohbet modunuzu ayarlar.'
        })
        .addStringOption(option => option
            .setName('mode')
            .setNameLocalizations({
                tr: 'mod'
            })
            .setDescription('The chat mode you want to set.')
            .setDescriptionLocalizations({
                tr: 'Ayarlamak istediğiniz sohbet modu.'
            })
            .setRequired(true)
            .addChoices(
                {
                    name: 'Automatic (Default, Recommended)',
                    name_localizations: {
                        tr: 'Otomatik (Varsayılan, Tavsiye Edilen)'
                    },
                    value: 'auto'
                },
                {
                    name: 'Functions Only (Recommended for functions)',
                    name_localizations: {
                        tr: 'Sadece Fonksiyonlar (Fonksiyonlar için tavsiye edilir)'
                    },
                    value: 'functions'
                }
            )
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let mode = interaction.options.getString('mode');

        await db.set(`users.${interaction.user.id}.mode`, mode);

        await interaction.editReply(localize(interaction.locale, 'CHAT_MODE_SET'));
    }
};