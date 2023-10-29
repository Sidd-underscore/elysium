const { default: axios } = require("axios");
const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const EmbedMaker = require("../modules/embed");
const { request, RequestMethod } = require("fetchu.js");
const { randomItem } = require("@tolga1452/toolbox.js");
const { ads } = require("../../config");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('draw-image')
        .setNameLocalizations({
            tr: 'resim-çiz'
        })
        .setDescription('Draws an image')
        .setDescriptionLocalizations({
            tr: 'Bir resim çizer'
        })
        .addStringOption(option => option
            .setName('prompt')
            .setDescription('The prompt you want to draw')
            .setDescriptionLocalizations({
                tr: 'Çizmek istediğiniz şey'
            })
            .setRequired(true)
        )
        .addIntegerOption(option => option
            .setName('count')
            .setNameLocalizations({
                tr: 'sayı'
            })
            .setDescription('The number of images you want to draw. Default: 1')
            .setDescriptionLocalizations({
                tr: 'Çizmek istediğiniz resim sayısı. Varsayılan: 1'
            })
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(4)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let prompt = interaction.options.getString('prompt');
        let count = interaction.options.getInteger('count') ?? 1;
        let user = await db.get(`users.${interaction.user.id}`) ?? {
            usage: 0,
            premium: false
        };
        let locale = interaction.locale;

        async function respond() {
            let adsMessage = randomItem(ads);

            await interaction.editReply({
                content: user.tier >= 2 ? null : `**ADS (buy premium to remove):** ${adsMessage}\nContact with **[@tolgchu](discord://-/users/329671025312923648)** to add your ad here.`,
                files: response.body.data.map(image => image.url)
            });

            user.usage++;

            await db.set(`users.${interaction.user.id}`, user);
        };

        let response = await request({
                url: 'https://api.mandrillai.tech/v1/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'dalle-3',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.MANDRILL_API_KEY}`
                }
            });
            
            console.log(response.status, response.body)

        if (response?.ok) return respond();
        else return interaction.editReply(localize(locale, 'MODELS_DOWN'));
    }
};