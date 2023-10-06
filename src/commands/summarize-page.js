const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { request, RequestMethod } = require("fetchu.js");
const { localize } = require("../modules/localization");
const { QuickDB } = require("quick.db");
const { default: axios } = require("axios");
const EmbedMaker = require("../modules/embed");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('summarize-page')
        .setNameLocalizations({
            tr: 'sayfayı-özetle'
        })
        .setDescription('Summarizes the given web page')
        .setDescriptionLocalizations({
            tr: 'Verilen web sayfasını özetler'
        })
        .addStringOption(option => option
            .setName('url')
            .setDescription('The URL of the web page you want to summarize')
            .setDescriptionLocalizations({
                tr: 'Özetlemek istediğiniz web sayfasının URL\'si'
            })
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('question')
            .setNameLocalizations({
                tr: 'soru'
            })
            .setDescription('The question you want to ask to the AI')
            .setDescriptionLocalizations({
                tr: 'Yapay zekaya sormak istediğiniz soru'
            })
            .setRequired(false)
        )
        .addBooleanOption(option => option
            .setName('debug')
            .setNameLocalizations({
                tr: 'hata-ayıklama'
            })
            .setDescription('Debug mode. Default: false')
            .setDescriptionLocalizations({
                tr: 'Hata ayıklama modu. Varsayılan: false'
            })
            .setRequired(false)
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply();

        let url = interaction.options.getString('url');
        let question = interaction.options.getString('question');
        let debug = interaction.options.getBoolean('debug') ?? false;
        let user = await db.get(`users.${interaction.user.id}`) ?? {
            usage: 0
        };
        let locale = interaction.locale;

        async function respond() {
            let respondMessage = response.body.choices[0].message.content;

            if (respondMessage.length > 1990) respondMessage = respondMessage.slice(0, 1990) + '...';

            await interaction.editReply({
                content: respondMessage,
                embeds: debug ? [
                    new EmbedMaker(interaction.client)
                        .setTitle('Debug')
                        .setFields(
                            {
                                name: 'Model',
                                value: response.body.model ?? 'Unknown',
                                inline: true
                            },
                            {
                                name: 'Provider',
                                value: response.body.provider ?? 'Unknown',
                                inline: true
                            }
                        )
                ] : []
            });

            user.usage++;

            await db.set(`users.${interaction.user.id}`, user);
        };

        let page = (await axios.get(url, {
            responseType: 'text'
        })).data;
        let response;

        if (page.length > 36000) page = page.slice(0, 36000) + '...';

        response = await request({
            url: 'https://beta.purgpt.xyz/openai/chat/completions',
            method: RequestMethod.Post,
            body: {
                model: 'gpt-3.5-turbo-16k',
                messages: [
                    {
                        role: 'user',
                        content: `${question ? `Find the answer of "${question}" question` : 'Summarize'} this page (${url}):\n\n${page}`
                    }
                ],
                fallbacks: ['gpt-3.5-turbo']
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });

        if (response.ok) return respond();
        else return interaction.editReply(localize(locale, 'MODELS_DOWN'));
    }
};