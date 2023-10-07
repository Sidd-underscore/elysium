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
        )
        .addStringOption(option => option
            .setName('style')
            .setDescription('The style you want to draw. Default: Regular')
            .setDescriptionLocalizations({
                tr: 'Çizmek istediğiniz tarz. Varsayılan: Normal'
            })
            .setRequired(false)
            .setChoices(
                {
                    name: 'Regular',
                    name_localizations: {
                        tr: 'Normal'
                    },
                    value: 'regular'
                },
                {
                    name: 'Anime',
                    value: 'anime'
                }
            )
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
        let count = interaction.options.getInteger('count') ?? 1;
        let style = interaction.options.getString('style') ?? 'regular';
        let debug = interaction.options.getBoolean('debug') ?? false;
        let user = await db.get(`users.${interaction.user.id}`) ?? {
            usage: 0,
            premium: false
        };
        let locale = interaction.locale;

        

        async function respond() {
            console.log(response.body);

            await interaction.editReply({
                files: response.body.data.map(image => image.url),
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

        if (style === 'regular') {
            response = await request({
                url: 'https://beta.purgpt.xyz/stabilityai/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'sdxl',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                }
            });

            if (response.ok) return respond();

            response = await request({
                url: 'https://elysium-verify.glitch.me/daku?path=/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'sdxl',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.VERIFY_KEY}`,
                    'x-daku-key': process.env.DAKU_API_KEY
                }
            });

            if (response.ok) return respond();

            response = await request({
                url: 'https://elysium-verify.glitch.me/daku?path=/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'anything-diffusion-5',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.VERIFY_KEY}`,
                    'x-daku-key': process.env.DAKU_API_KEY
                }
            });

            if (response.ok) return respond();

            response = await request({
                url: 'https://elysium-verify.glitch.me/daku?path=/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'stable-diffusion-2.1',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.VERIFY_KEY}`,
                    'x-daku-key': process.env.DAKU_API_KEY
                }
            });

            if (response.ok) return respond();

            response = await request({
                url: 'https://elysium-verify.glitch.me/daku?path=/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'dreamshaper-8',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.VERIFY_KEY}`,
                    'x-daku-key': process.env.DAKU_API_KEY
                }
            });

            if (response.ok) return respond();

            response = await request({
                url: 'https://beta.purgpt.xyz/openai/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'dall-e',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                }
            });
            
            if (response.ok) return respond();

            response = await request({
                url: 'https://beta.purgpt.xyz/hugging-face/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'stable-diffusion-1.5',
                    prompt
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
                }
            }, {
                isNotOk: response => console.log(response.body)
            });
        } else if (style === 'anime') {
            response = await request({
                url: 'https://elysium-verify.glitch.me/daku?path=/images/generations',
                method: RequestMethod.Post,
                body: {
                    model: 'anime-diffusion-xl',
                    prompt,
                    n: count
                },
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.VERIFY_KEY}`,
                    'x-daku-key': process.env.DAKU_API_KEY
                }
            });
        };

        if (response?.status === 200) return respond();
        else return interaction.editReply(localize(locale, 'MODELS_DOWN'));
    }
};