const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { localize, getPercentage } = require("../modules/localization");
const EmbedMaker = require("../modules/embed");
const { randomItem } = require("@tolga1452/toolbox.js");
const { ads } = require("../../config");
const { QuickDB } = require("quick.db");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('help')
        .setNameLocalizations({
            tr: 'yardım'
        })
        .setDescription('Shows the help menu')
        .setDescriptionLocalizations({
            tr: 'Yardım menüsünü gösterir'
        }),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let user = await db.get(`users.${interaction.user.id}`) ?? {
            tier: 0,
            bonus: 0,
            usage: 0,
            imageEdits: false,
            gpt4: false,
            gifts: []
        };

        let allCommands = await interaction.client.application.commands.fetch();
        let commands = interaction.client.commands.toJSON();
        let locale = interaction.locale;
        let commandCategories = {};

        const embed = new EmbedMaker(interaction.client)
            .setTitle(localize(locale, 'HELP_MENU_TITLE'))
            .setDescription(localize(locale, 'LOCALIZATION_PERCENTAGE', locale, getPercentage(locale)))
            .setFields({
                name: localize(locale, 'CONDITIONS'),
                value: localize(locale, 'TOS_AND_PRIVACY')
            });

        for (let command of commands) {
            let category = command.category;

            if (!commandCategories[category]) commandCategories[category] = [];

            commandCategories[category].push(command.data.name);
        };

        for (let category in commandCategories) {
            embed.addFields({
                name: localize(locale, `COMMAND_CATEGORY_${category.toUpperCase()}`),
                value: commandCategories[category].map(command => `</${command}:${allCommands.filter(cmd => cmd.name === command).first().id}>`).join(', ')
            });
        };

        let adsMessage = randomItem(ads);

        interaction.editReply({
            content: user.tier >= 2 ? null : `**ADS (buy premium to remove):** ${adsMessage}\nContact **[@tolgchu](discord://-/users/329671025312923648)** to advertise here.`,
            embeds: [embed]
        });
    }
};
