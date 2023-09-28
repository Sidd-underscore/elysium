const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");

const db = new QuickDB();

module.exports = {
    category: 'Owner',
    data: new SlashCommandBuilder()
        .setName('create-promo-code')
        .setDescription('Create a promo code.')
        .addIntegerOption(option => option
            .setName('requests')
            .setDescription('The number of requests that can be made with this promo code.')
            .setRequired(false)
        )
        .addIntegerOption(option => option
            .setName('item-1')
            .setDescription('The number of item 1 that can be given with this promo code.')
            .setRequired(false)
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
                    name: 'Image edits and variations',
                    value: 4
                },
                {
                    name: 'Original GPT-4 access',
                    value: 5
                }
            )
        )
        .addIntegerOption(option => option
            .setName('item-2')
            .setDescription('The number of item 2 that can be given with this promo code.')
            .setRequired(false)
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
                    name: 'Image edits and variations',
                    value: 4
                },
                {
                    name: 'Original GPT-4 access',
                    value: 5
                }
            )
        )
        .addIntegerOption(option => option
            .setName('item-3')
            .setDescription('The number of item 3 that can be given with this promo code.')
            .setRequired(false)
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
                    name: 'Image edits and variations',
                    value: 4
                },
                {
                    name: 'Original GPT-4 access',
                    value: 5
                }
            )
        )
        .addBooleanOption(option => option
            .setName('everyone')
            .setDescription('Would you like to give this promo code to everyone?')
            .setRequired(false)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let requests = interaction.options.getInteger('requests');
        let item1 = interaction.options.getInteger('item-1');
        let item2 = interaction.options.getInteger('item-2');
        let item3 = interaction.options.getInteger('item-3');
        let everyone = interaction.options.getBoolean('everyone');
        let codeData = {
            requests
        };
        let items = [item1, item2, item3];

        if (items.includes(1)) codeData.tier = 1;
        if (items.includes(2)) codeData.tier = 2;
        if (items.includes(3)) codeData.tier = 3;
        if (items.includes(4)) codeData.imageEdits = true;
        if (items.includes(5)) codeData.gpt4 = true;

        if (everyone) {
            let users = await db.get('users') ?? {};

            for (let user in users) {
                let code = Math.random().toString(36).substring(2, 15);

                codeData.code = code;
                codeData.gift = user;

                await db.set(`promoCodes.${code}`, codeData);

                if (!users[user].gifts) users[user].gifts = [];

                users[user].gifts.push(code);

                await db.set(`users.${user}`, users[user]);
            };

            interaction.editReply('Promo code created for everyone.');
        } else {
            let code = Math.random().toString(36).substring(2, 15);

            codeData.code = code;

            await db.set(`promoCodes.${code}`, codeData);

            interaction.editReply(`Created promo code **\`${code}\`** with **${requests}** requests and items **${items.join(', ')}**.`);
        };
    }
};