const { SlashCommandBuilder, ChatInputCommandInteraction, ContextMenuCommandBuilder, ApplicationCommandType, UserContextMenuCommandInteraction, MessageContextMenuCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const { randomItem } = require("@tolga1452/toolbox.js");
const { ads } = require("../../config");
const crypto = require("crypto");
const timer = require("../modules/timer");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new ContextMenuCommandBuilder()
        .setType(ApplicationCommandType.Message)
        .setName('Save Memory')
        .setNameLocalizations({
            tr: 'Anıyı Kaydet'
        }),
    /**
     * @param {MessageContextMenuCommandInteraction} interaction 
     */
    async execute(interaction) {
        let locale = interaction.locale;

        if (interaction.targetMessage.author.id !== interaction.client.user.id) return interaction.reply({
            content: localize(locale, 'ONLY_BOT_MESSAGES'),
            ephemeral: true
        });

        await interaction.deferReply({ ephemeral: true });

        let user = await db.get(`users.${interaction.user.id}`) ?? {};

        if (user.tier < 1) return interaction.editReply({
            content: localize(locale, 'TIER_NOT_ENOUGH', 1),
            ephemeral: true
        });
        if (!user.lastSave) user.lastSave = 0;
        if (Date.now() - user.lastSave < 600000) return interaction.editReply({
            content: localize(locale, 'COOLDOWN', 10),
            ephemeral: true
        });

        user.lastSave = Date.now();

        let memories = await db.get('memories');

        if (!memories) memories = [];

        let memoryId = crypto.randomBytes(16).toString('hex');

        memories.push({
            memory: `Manually saved memory by user ${interaction.user.id}: ${interaction.targetMessage.content}`,
            id: memoryId
        });

        await db.set('memories', memories);

        timer('custom', {
            time: 86400000,
            callback: async () => {
                let memories = await db.get('memories');

                if (!memories) memories = [];

                memories = memories.filter(memory => memory.id !== c.memoryId);

                await db.set('memories', memories);
            },
            config: {
                memoryId
            }
        });
    }
};