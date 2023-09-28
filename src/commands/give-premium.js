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
        .addIntegerOption(option => option
            .setName('item')
            .setDescription('The item you want to give to the user')
            .setRequired(true)
            .setChoices(
                {
                    name: 'Tier 1',
                    value: 1
                },
                {
                    name: 'Tier 2',
                    value: 2
                },
                {
                    name: 'Tier 3',
                    value: 3
                },
                {
                    name: 'Starter Pack',
                    value: 4
                },
                {
                    name: '50 Requests',
                    value: 5
                },
                {
                    name: '100 Requests',
                    value: 6
                },
                {
                    name: '250 Requests',
                    value: 7
                },
                {
                    name: '500 Requests',
                    value: 8
                },
                {
                    name: '1000 Requests',
                    value: 9
                }
            )
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
        let item = interaction.options.getInteger('tier');
        let userData = await db.get(`users.${user.id}`) ?? {
            usage: 0,
            tier: 0,
            bonus: 0
        };

        if (!userData.bonus) userData.bonus = 0;

        if ([1, 2, 3].includes(item)) {
            userData.tier = item;

            if (item >= 2) userData.imageEdits = true;
            if (item === 3) userData.gpt4 = true;

            timer('sendUserMessage', { // 1 month
                time: 2592000000,
                callback: async () => {
                    await db.set(`users.${c.userId}.tier`, 0);
                    await db.set(`users.${c.userId}.imageEdits`, false);
                    await db.set(`users.${c.userId}.gpt4`, false);
                },
                userId: ownerId,
                message: `The premium of **[\`${user.id}\`](https://github.com/${github}) (${github})** has expired! The check notifier will be sent in 1 day.`,
                config: {
                    userId: user.id,
                }
            });
            timer('sendUserMessage', { // 1 month + 1 day
                time: 2592000000 + 86400000,
                userId: ownerId,
                message: `The premium of **[\`${user.id}\`](https://github.com/${github}) (${github})** has expired! It's time to check the premium status.`
            });
        } else if (item === 4) {
            // deprecated
        } else if (item === 5) userData.bonus += 50;
        else if (item === 6) userData.bonus += 100;
        else if (item === 7) userData.bonus += 250;
        else if (item === 8) userData.bonus += 500;
        else if (item === 9) userData.bonus += 1000;

        await db.set(`users.${user.id}`, userData);

        interaction.editReply(`Successfully made <@${user.id}> premium!`);
    }
};