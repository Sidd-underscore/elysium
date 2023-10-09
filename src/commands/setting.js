const { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const { randomItem } = require("@tolga1452/toolbox.js");
const { ads } = require("../../config");

const db = new QuickDB();

module.exports = {
    category: 'Moderator',
    data: new SlashCommandBuilder()
        .setName('setting')
        .setNameLocalizations({
            tr: 'ayar'
        })
        .setDescription("Manage the bot's settings")
        .setDescriptionLocalizations({
            tr: 'Bot ayarlarını yönetin'
        })
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommandGroup(group => group
            .setName('random-chat')
            .setNameLocalizations({
                tr: 'rastgele-sohbet'
            })
            .setDescription('Random chat settings')
            .setDescriptionLocalizations({
                tr: 'Rastgele sohbet ayarları'
            })
            .addSubcommand(subcommand => subcommand
                .setName('toggle')
                .setNameLocalizations({
                    tr: 'aç-kapat'
                })
                .setDescription('Toggle the random chat')
                .setDescriptionLocalizations({
                    tr: 'Rastgele sohbeti açıp kapatın'
                })
                .addBooleanOption(option => option
                    .setName('status')
                    .setNameLocalizations({
                        tr: 'durum'
                    })
                    .setDescription('The status you want to set')
                    .setDescriptionLocalizations({
                        tr: 'Ayarlamak istediğiniz durum'
                    })
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName('set-possibility')
                .setNameLocalizations({
                    tr: 'olasılık-ayarla'
                })
                .setDescription('Set the possibility of random chat')
                .setDescriptionLocalizations({
                    tr: 'Rastgele sohbetin olasılığını ayarlayın'
                })
                .addIntegerOption(option => option
                    .setName('possibility')
                    .setNameLocalizations({
                        tr: 'olasılık'
                    })
                    .setDescription('The possibility you want to set. Default: 1%')
                    .setDescriptionLocalizations({
                        tr: 'Ayarlamak istediğiniz olasılık. Varsayılan: %1'
                    })
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(25)
                )
            )
        )
        .addSubcommandGroup(group => group
            .setName('ai-channel')
            .setNameLocalizations({
                tr: 'yapay-zeka-kanalı'
            })
            .setDescription('AI channel settings')
            .setDescriptionLocalizations({
                tr: 'Yapay zeka kanalı ayarları'
            })
            .addSubcommand(subcommand => subcommand
                .setName('toggle')
                .setNameLocalizations({
                    tr: 'aç-kapat'
                })
                .setDescription('Toggle the AI channel')
                .setDescriptionLocalizations({
                    tr: 'Yapay zeka kanalını açıp kapatın'
                })
                .addBooleanOption(option => option
                    .setName('status')
                    .setNameLocalizations({
                        tr: 'durum'
                    })
                    .setDescription('The status you want to set')
                    .setDescriptionLocalizations({
                        tr: 'Ayarlamak istediğiniz durum'
                    })
                    .setRequired(true)
                )
            )
            .addSubcommand(subcommand => subcommand
                .setName('set')
                .setNameLocalizations({
                    tr: 'ayarla'
                })
                .setDescription('Set the AI channel')
                .setDescriptionLocalizations({
                    tr: 'Yapay zeka kanalını ayarlayın'
                })
                .addChannelOption(option => option
                    .setName('channel')
                    .setNameLocalizations({
                        tr: 'kanal'
                    })
                    .setDescription('The channel you want to set')
                    .setDescriptionLocalizations({
                        tr: 'Ayarlamak istediğiniz kanal'
                    })
                    .setRequired(true)
                    .addChannelTypes(ChannelType.GuildText)
                )
            )
        )
        .addSubcommandGroup(group => group
            .setName('welcomer')
            .setNameLocalizations({
                tr: 'karşılayıcı'
            })
            .setDescription('Welcomer settings')
            .setDescriptionLocalizations({
                tr: 'Karşılayıcı ayarları'
            })
            .addSubcommand(subcommand => subcommand
                .setName('toggle')
                .setNameLocalizations({
                    tr: 'aç-kapat'
                })
                .setDescription('Toggle the welcomer')
                .setDescriptionLocalizations({
                    tr: 'Karşılayıcıyı açıp kapatın'
                })
                .addBooleanOption(option => option
                    .setName('status')
                    .setNameLocalizations({
                        tr: 'durum'
                    })
                    .setDescription('The status you want to set')
                    .setDescriptionLocalizations({
                        tr: 'Ayarlamak istediğiniz durum'
                    })
                    .setRequired(true)
                )
            )
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let subcommandGroup = interaction.options.getSubcommandGroup();
        let subcommand = interaction.options.getSubcommand();
        let guild = await db.get(`guilds.${interaction.guild.id}`) ?? {};
        let user = await db.get(`users.${interaction.user.id}`) ?? {};
        let locale = interaction.locale;

        if (subcommandGroup === 'random-chat') {
            if (subcommand === 'toggle') {
                let status = interaction.options.getBoolean('status');

                if (!guild.randomChat) guild.randomChat = {
                    status: false,
                    possibility: 1
                };

                guild.randomChat.status = status;

                await db.set(`guilds.${interaction.guild.id}`, guild);

                let adsMessage = randomItem(ads);

                interaction.editReply(`${localize(locale, 'SETTING_SET')}${user.tier >= 2 ? '' : `\n\n**ADS (buy premium to remove):** ${adsMessage}\nContact with **[@tolgchu](discord://-/users/329671025312923648)** to add your ad here.`}}`);
            } else if (subcommand === 'set-possibility') {
                let possibility = interaction.options.getInteger('possibility');

                if (!guild.randomChat) guild.randomChat = {
                    status: false,
                    possibility: 1
                };

                guild.randomChat.possibility = possibility;

                await db.set(`guilds.${interaction.guild.id}`, guild);

                let adsMessage = randomItem(ads);

                interaction.editReply(`${localize(locale, 'SETTING_SET')}${user.tier >= 2 ? '' : `\n\n**ADS (buy premium to remove):** ${adsMessage}\nContact with **[@tolgchu](discord://-/users/329671025312923648)** to add your ad here.`}`);
            };
        } else if (subcommandGroup === 'ai-channel') {
            if (subcommand === 'toggle') {
                let status = interaction.options.getBoolean('status');

                if (!guild.aiChannel) guild.aiChannel = {
                    status: false,
                    channel: null
                };

                guild.aiChannel.status = status;

                await db.set(`guilds.${interaction.guild.id}`, guild);

                let adsMessage = randomItem(ads);

                interaction.editReply(`${localize(locale, 'SETTING_SET')}${user.tier >= 2 ? '' : `\n\n**ADS (buy premium to remove):** ${adsMessage}\nContact with **[@tolgchu](discord://-/users/329671025312923648)** to add your ad here.`}`);
            } else if (subcommand === 'set') {
                let channel = interaction.options.getChannel('channel');

                if (!guild.aiChannel) guild.aiChannel = {
                    status: false,
                    channel: null
                };

                guild.aiChannel.channel = channel.id;

                await db.set(`guilds.${interaction.guild.id}`, guild);

                let adsMessage = randomItem(ads);

                interaction.editReply(`${localize(locale, 'SETTING_SET')}${user.tier >= 2 ? '' : `\n\n**ADS (buy premium to remove):** ${adsMessage}\nContact with **[@tolgchu](discord://-/users/329671025312923648)** to add your ad here.`}`);
            };
        } else if (subcommandGroup === 'welcomer') {
            if (subcommand === 'toggle') {
                let status = interaction.options.getBoolean('status');

                if (!guild.welcomer) guild.welcomer = {
                    status: false
                };

                guild.welcomer.status = status;

                await db.set(`guilds.${interaction.guild.id}`, guild);

                let adsMessage = randomItem(ads);

                interaction.editReply(`${localize(locale, 'SETTING_SET')}${user.tier >= 2 ? '' : `\n\n**ADS (buy premium to remove):** ${adsMessage}\nContact with **[@tolgchu](discord://-/users/329671025312923648)** to add your ad here.`}`);
            };
        };
    }
};
