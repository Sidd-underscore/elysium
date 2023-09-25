const { default: axios } = require("axios");
const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const EmbedMaker = require("../modules/embed");
const { request, RequestMethod } = require("fetchu.js");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('speak')
        .setNameLocalizations({
            tr: 'konuştur'
        })
        .setDescription("Speaks the given prompt")
        .setDescriptionLocalizations({
            tr: 'Verilen metni konuşturur'
        })
        .addStringOption(option => option
            .setName('prompt')
            .setDescription('The prompt you want to speak')
            .setDescriptionLocalizations({
                tr: 'Konuşturmak istediğiniz metin'
            })
            .setRequired(true)
        )
        .addBooleanOption(option => option
            .setName('debug')
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

        let prompt = interaction.options.getString('prompt');
        let debug = interaction.options.getBoolean('debug') ?? false;
        let user = await db.get(`users.${interaction.user.id}`) ?? {
            usage: 0,
            premium: false
        };
        let locale = interaction.locale;

        if (user.usage >= 25 && !user.premium) return interaction.editReply(localize(locale, 'LIMIT_REACHED', 25));

        async function respond() {
            await interaction.editReply({
                files: [response.body.url],
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

        let response;

        response = await request({
            url: 'https://beta.purgpt.xyz/google/audio/speech',
            method: RequestMethod.Post,
            body: {
                model: 'google-speech',
                input: prompt
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        }, {
            isNotOk: response => console.log(response.body)
        });

        if (response.ok) return respond();
        else return interaction.editReply(localize(locale, 'MODELS_DOWN'));
    }
};