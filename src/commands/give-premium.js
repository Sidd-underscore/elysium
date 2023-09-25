const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const timer = require("../modules/timer");
const { ownerId } = require("../../config");
const { QuickDB } = require("quick.db");

const db = new QuickDB();

module.exports = {
    category: 'Owner',
    data: new SlashCommandBuilder()
        .setName('give-premium')
        .setDescription('Makes the user premium')
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user you want to make premium')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('github')
            .setDescription(`The user's GitHub username`)
            .setRequired(true)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let user = interaction.options.getUser('user');
        let github = interaction.options.getString('github');
        let userData = await db.get(`users.${user.id}`) ?? {
            usage: 0,
            premium: false
        };

        userData.premium = true;

        await db.set(`users.${user.id}`, userData);

        timer('sendUserMessage', { // 1 month
            time: 2592000000,
            callback: async () => {
                await db.set(`users.${c.userId}.premium`, false);
            },
            userId: ownerId,
            message: `The premium of **[\`${user.id}\`](https://github.com/${github})** has expired! The check notifier will be sent in 1 day.`
        });
        timer('sendUserMessage', { // 1 month + 1 day
            time: 2592000000 + 86400000,
            userId: ownerId,
            message: `The premium of **[\`${user.id}\`](https://github.com/${github})** has expired! It's time to check the premium status.`
        });

        interaction.editReply(`Successfully made <@${user.id}> premium!`);
    }
};