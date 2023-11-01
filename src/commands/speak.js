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

        async function respond() {
            let adsMessage = randomItem(ads);

            await interaction.editReply({
                content: user.tier >= 2 ? null : `\n\n**ADS (buy premium to remove):** ${adsMessage}\nContact **[@tolgchu](discord://-/users/329671025312923648)** to advertise here.`,
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
                                value: response.body.provider ?? 'DakuGPT',
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
            url: 'https://elysium-verify.glitch.me/daku?path=/audio/speech',
            method: RequestMethod.Post,
            body: {
                model: 'voice-charlotte',
                input: prompt
            },
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.VERIFY_KEY}`,
                'x-daku-key': process.env.DAKU_API_KEY
            }
        }, {
            isNotOk: response => console.log(response.body)
        });

        if (response.ok) return respond();
        else return interaction.editReply(localize(locale, 'MODELS_DOWN'));
    }
};
