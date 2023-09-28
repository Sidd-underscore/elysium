const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const timer = require("../modules/timer");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('promo-code')
        .setNameLocalizations({
            tr: 'promo-kodu'
        })
        .setDescription('Use a promo code.')
        .setDescriptionLocalizations({
            tr: 'Bir promo kodu kullanın.'
        })
        .addStringOption(option => option
            .setName('code')
            .setNameLocalizations({
                tr: 'kod'
            })
            .setDescription('The promo code you want to use.')
            .setDescriptionLocalizations({
                tr: 'Kullanmak istediğiniz promo kodu.'
            })
            .setRequired(true)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let code = interaction.options.getString('code');
        let promoCode = await db.get(`promoCodes.${code}`);
        let locale = interaction.locale;

        if (!promoCode) return interaction.editReply(localize(locale, 'INVALID_CODE'));
        if (promoCode.gift && promoCode.gift !== interaction.user.id) return interaction.editReply(localize(locale, 'PROMO_CODE_CANNOT_BE_USED'));

        let user = await db.get(`users.${interaction.user.id}`) ?? {};

        if (promoCode.tier) {
            user.tier = promoCode.tier;

            if (promoCode.tier >= 2) promoCode.imageEdits = true;
            if (promoCode.tier === 3) promoCode.gpt4 = true;

            timer('custom', { // 1 month
                time: 2592000000,
                callback: async () => {
                    await db.set(`users.${c.userId}.tier`, 0);
                    await db.set(`users.${c.userId}.imageEdits`, false);
                    await db.set(`users.${c.userId}.gpt4`, false);
                },
                config: {
                    userId: interaction.user.id,
                }
            });
        }
        if (promoCode.requests) {
            if (!user.bonus) user.bonus = 0;

            user.bonus += promoCode.requests;
        }
        if (promoCode.imageEdits) {
            user.imageEdits = true;

            timer('custom', { // 1 month
                time: 2592000000,
                callback: async () => {
                    await db.set(`users.${c.userId}.imageEdits`, false);
                },
                config: {
                    userId: interaction.user.id,
                }
            });
        }
        if (promoCode.gpt4) {
            user.gpt4 = true;

            timer('custom', { // 1 month
                time: 2592000000,
                callback: async () => {
                    await db.set(`users.${c.userId}.gpt4`, false);
                },
                config: {
                    userId: interaction.user.id,
                }
            });
        };

        if (promoCode.gift) user.gifts = user.gifts.filter(gift => gift !== code);

        await db.set(`users.${interaction.user.id}`, user);
        await db.delete(`promoCodes.${code}`);

        interaction.editReply(localize(locale, 'PROMO_CODE_USED'));
    }
};