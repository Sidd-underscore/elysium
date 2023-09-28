const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const EmbedMaker = require("../modules/embed");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('account')
        .setNameLocalizations({
            tr: 'hesap'
        })
        .setDescription('Shows your account information.')
        .setDescriptionLocalizations({
            tr: 'Hesap bilgilerinizi gösterir.'
        }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let user = await db.get(`users.${interaction.user.id}`) ?? {
            tier: 0,
            bonus: 0,
            usage: 0,
            imageEdits: false,
            gpt4: false,
            gifts: []
        };
        let locale = interaction.locale;

        if (!user.usage) user.usage = 0;
        if (!user.bonus) user.bonus = 0;
        if (!user.gifts) user.gifts = [];
        if (!user.imageEdits) user.imageEdits = false;
        if (!user.gpt4) user.gpt4 = false;
        if (!user.tier) user.tier = 0;

        interaction.editReply({
            embeds: [
                new EmbedMaker(interaction.client)
                .setTitle(localize(locale, 'PERSONAL_ACCOUNT'))
                .setDescription(`- **${localize(locale, 'USAGE')}:** ${user.usage}/${!user.tier ? 50 : user.tier === 1 ? 100 : user.tier === 2 ? 200 : '∞'}\n- **${localize(locale, 'BONUS')}:** ${user.bonus}\n- **${localize(locale, 'TIER')}:** ${user.tier ?? localize(locale, 'FREE')}\n- **${localize(locale, 'IMAGE_EDITS')}:** ${user.imageEdits ? '✅' : '❌'}\n- **${localize(locale, 'GPT4')}:** ${user.gpt4 ? '✅' : '❌'}\n- **${localize(locale, 'GIFTS')}:** ${user.gifts.length ? user.gifts.map(gift => `||\`${gift}\`||`).join(', ') : localize(locale, 'NONE')}`)
            ]
        });
    }
};