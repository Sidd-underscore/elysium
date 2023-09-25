const { default: axios } = require("axios");
const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");
const { QuickDB } = require("quick.db");
const { localize } = require("../modules/localization");
const EmbedMaker = require("../modules/embed");
const { request, RequestMethod } = require("fetchu.js");
const sharp = require("sharp");

const db = new QuickDB();

module.exports = {
    category: 'General',
    data: new SlashCommandBuilder()
        .setName('explain-image')
        .setNameLocalizations({
            tr: 'resim-açıkla'
        })
        .setDescription('Explains an image')
        .setDescriptionLocalizations({
            tr: 'Bir resmi açıklar'
        })
        .addAttachmentOption(option => option
            .setName('image')
            .setDescription('The image you want to explain')
            .setDescriptionLocalizations({
                tr: 'Açıklamak istediğiniz resim'
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

        let attachment = interaction.options.getAttachment('image');
        let debug = interaction.options.getBoolean('debug') ?? false;
        let user = await db.get(`users.${interaction.user.id}`) ?? {
            usage: 0,
            premium: false
        };
        let locale = interaction.locale;

        if (user.usage >= 25 && !user.premium) return interaction.editReply(localize(locale, 'LIMIT_REACHED', 25));
        if (attachment.contentType !== 'image/png' && attachment.contentType !== 'image/jpeg') return interaction.editReply(localize(locale, 'INVALID_IMAGE'));

        async function respond() {
            await interaction.editReply({
                content: response.data.result,
                embeds: debug ? [
                    new EmbedMaker(interaction.client)
                        .setTitle('Debug')
                        .setFields(
                            {
                                name: 'Model',
                                value: response.data.model ?? 'Unknown',
                                inline: true
                            },
                            {
                                name: 'Provider',
                                value: response.data.provider ?? 'Unknown',
                                inline: true
                            }
                        )
                ] : []
            });

            user.usage++;

            await db.set(`users.${interaction.user.id}`, user);
        };

        let imageBuffer = await axios.get(attachment.url, {
            responseType: 'arraybuffer'
        });
        let image = await sharp(imageBuffer.data)
            .resize(200)
            .png({
                compressionLevel: 4,
                quality: 70
            })
            .toBuffer()
        let response;

        response = await axios.post('https://beta.purgpt.xyz/hugging-face/images/explain', {
            model: 'blip-image-captioning-large',
            image: image.toString('base64')
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.PURGPT_API_KEY}`
            }
        });

        console.log(response);

        if (response?.status === 200) return respond();
        else return interaction.editReply(localize(locale, 'MODELS_DOWN'));
    }
};