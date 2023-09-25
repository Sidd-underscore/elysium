const { EmbedBuilder, Client } = require("discord.js");
const { serverId, useServerIconForFooter, ownerId } = require("../../config");

module.exports = class EmbedMaker extends EmbedBuilder {
    /**
     * @param {Client} client 
     */
    constructor(client) {
        super();

        client.users.fetch(ownerId).then(owner => {

        this.setColor('9b59b6');
        this.setFooter({
            text: `Made with ❤️ by @${owner.username}`,
            iconURL: useServerIconForFooter ? client.guilds.cache.get(serverId).iconURL({ forceStatic: true }) : client.user.displayAvatarURL({ forceStatic: true })
        });
        });
    };
};
