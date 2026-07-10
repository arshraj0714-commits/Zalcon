import { Command } from '#command';
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} from 'discord.js';
import { emoji, resolveEmojiObject } from '#emoji';
import { db } from '#dbManager';

// Category definitions — store the raw falcon emoji names so they can be
// resolved to objects for the dropdown select menu.
function getCategories() {
    return {
        index: {
            label: 'Index',
            emojiName: 'falcon_home',
            description: 'The help page showing how to use the bot',
            title: 'Index',
            body: `This is the main help page. Use the dropdown menu below to select a category and view its commands.\n\nMy prefix in this guild is \`-\`. You can also use slash commands (\`/\`).`,
            commands: [],
        },
        invites: {
            label: 'Invite tracking',
            emojiName: 'falcon_invite',
            description: 'Shows the information about invite tracking feature',
            title: 'Invite tracking',
            subtitle: 'Tracks and logs the server invites',
            commands: [
                ['invites', 'Displays the invites stats of a member'],
                ['inviter', 'Displays the inviter of a server member'],
                ['invited', 'Displays the invited list of a member'],
                ['inviteinfo', 'Displays the active invite code(s) of a user in this guild'],
                ['setjoinchannel', 'Set the welcome channel! All invites welcome message will appear there'],
                ['addinvites', 'Adds a number of invites to a user !'],
                ['removeinvites', 'Removes a number of invites from a user !'],
                ['unsetwelcomechannel', 'Unset the welcome channel! Note that this command will disable the welcome messages'],
                ['setleavechannel', 'Sets the member leave channel'],
                ['unsetleavechannel', 'Unsets the member leave channel! Note that this will disable member leave messages'],
                ['setjoinmessage', 'Set a custom join message'],
                ['unsetjoinmessage', 'Deletes your custom join message'],
                ['setleavemessage', 'Set a custom leave message'],
                ['unsetleavemessage', 'Deletes your custom leave message'],
                ['variables', 'Displays the variables so that you can use them in custom welcome message'],
                ['testmessage', 'Displays your custom join message which you enter as an argument!'],
                ['clearinvites', "Resets everyone's invites or a user's invites statistics in this guild"],
                ['resetmyinvites', 'Clears your own invites in this guild (no permissions required)'],
                ['leaderboard invites', 'Displays the top 10 inviters in this guild'],
            ],
        },
        messages: {
            label: 'Messages',
            emojiName: 'falcon_msg',
            description: 'Shows the information about message counting feature',
            title: 'Messages',
            subtitle: "Keeps the count of users' messages",
            commands: [
                ['messages', 'Displays the number of messages sent by you or a user'],
                ['addmessages', 'Adds the specified number of messages to a user'],
                ['removemessages', 'Removes the specified number of messages to a user'],
                ['blacklistchannel', 'Blacklists a channel , I wont count messages from that channel'],
                ['unblacklistchannel', 'Unblacklists a channel'],
                ['blacklistedchannels', 'Displays the blacklisted channels of a guild'],
                ['clearmessages', "Resets everyone's messages or a user's messages in this guild"],
                ['resetmymessages', 'Resets your own messages that you sent in this guild (no permissions required)'],
                ['leaderboard messages', 'Displays the top 10 messengers of a server'],
                ['leaderboard dailymessages', 'Displays the top 10 daily active messengers of a server'],
            ],
        },
        voice: {
            label: 'Voice',
            emojiName: null,
            unicodeEmoji: '🔊',
            description: 'Shows the information about voice state tracking',
            title: 'Voice',
            subtitle: 'Tracks voice state stats of users',
            commands: [
                ['vc', 'Displays the voice state stats of a user'],
                ['clearvoice', "Resets everyone's voice state stats or a user's voice state stats in this guild"],
                ['resetmyvoice', 'Resets your own voice state record in this guild (no permissions required)'],
            ],
        },
        game: {
            label: 'Game',
            emojiName: null,
            unicodeEmoji: '🎮',
            description: 'Shows the information about games',
            title: 'Game',
            subtitle: 'Play games against the bot',
            commands: [
                ['snakewatergun', 'Play snake water gun game against the bot'],
            ],
        },
        leaderboard: {
            label: 'Leaderboard',
            emojiName: 'falcon_trophy',
            description: 'Shows the information about leaderboards',
            title: 'Leaderboard',
            subtitle: 'Displays the top 10 users of a category',
            commands: [
                ['leaderboard', 'Displays the top 10 users of a category'],
                ['leaderboard invites', 'Displays the top 10 inviters in this guild'],
                ['leaderboard messages', 'Returns the top 10 messengers of a server'],
                ['leaderboard dailymessages', 'Displays the top 10 daily active messengers of a server'],
            ],
        },
        giveaways: {
            label: 'Giveaway',
            emojiName: 'falcon_giveaway',
            description: 'Shows the information about giveaway feature',
            title: 'Giveaway',
            subtitle: 'Create giveaways in your Discord server',
            commands: [
                ['gstart', 'Creates a giveaway'],
                ['greroll', 'Rerolls an ended giveaway'],
                ['gend', 'Ends an active giveaway'],
            ],
        },
        greet: {
            label: 'Greet',
            emojiName: 'falcon_greet',
            description: 'Shows you the information about greet welcome feature',
            title: 'Set greet message',
            subtitle: 'You can set greet message in over 3 channels with join message and join message delete time',
            commands: [
                ['greet', 'Sets a greet to welcome new members'],
                ['disablegreet', 'Disables the greet welcome system of a channel'],
                ['greetchannels', 'Displays the total channels set for greet welcome system'],
                ['greetvariables', 'Displays the variables that you can use them in greet welcome message'],
            ],
            note: 'Requires administrator permissions to use these command except greetchannels requires manage guild permissions and greet variables is open to all',
        },
        timer: {
            label: 'Timer',
            emojiName: 'falcon_timer',
            description: 'Shows you the information about event timer feature',
            title: 'Timer',
            subtitle: 'Create a timer, pause it, resume it and end it',
            commands: [
                ['tstart', 'Starts the timer'],
                ['tpause', 'Pauses the active timer'],
                ['tresume', 'Resumes the paused timer'],
                ['tend', 'Ends an active timer'],
            ],
            note: 'You can enter time like this, 50s for 50 seconds,2m for 2 minutes,2h for 2 hours,1d for 1 day, if you want to set timer like for 1 day and 12 hours then enter the time in hours format, example :- 36h\nMust have manage guild permission to use this command',
        },
        moderation: {
            label: 'Moderation',
            emojiName: 'falcon_moderation',
            description: 'Shows you the information about moderation features',
            title: 'Moderation',
            subtitle: 'Moderate your server with these commands',
            commands: [
                ['kick', 'Kicks a user from a guild'],
                ['erase', 'Delete a number of messages from a channel'],
                ['ban', 'Bans a user from a guild'],
                ['unban', 'Unbans a banned user from a Discord server'],
                ['mute', 'Mutes a server member for a specified amount of time'],
                ['unmute', 'Unmutes a server member'],
            ],
        },
        polls: {
            label: 'Polls',
            emojiName: 'Falcon_poll',
            description: 'Shows you the information about the polls feature',
            title: 'Polls',
            subtitle: 'Creates a poll',
            commands: [
                ['createpoll', 'Create a poll'],
                ['epoll', 'Ends an active poll'],
            ],
        },
        utility: {
            label: 'Utilites',
            emojiName: 'falcon_utility',
            description: 'Shows you the information about utility features',
            title: 'Utilites',
            subtitle: 'More info on Utility commands of the bot',
            commands: [
                ['premium', 'Shows information about Zalcon Premium'],
                ['nuke', 'Nukes a TextChannel'],
                ['serverinfo', 'Displays the information about a server'],
                ['userinfo', 'Displays the information of member'],
                ['roleinfo', "Displays the information about a guild's role"],
                ['vcinfo', 'Displays the information about a voice channel'],
                ['avatar', 'Displays the avatar of a user'],
                ['banner', 'Displays the banner of a user'],
                ['guildbanner', "Displays a guild's banner"],
                ['support', 'Displays the invite link of my support server'],
                ['membercount', 'Displays the member count of the server'],
                ['stats', 'Displays the stats of the bot and its vps'],
                ['shards', 'Displays the information about the shards'],
                ['permissions', 'Displays the information about what permissions the bot requires to function properly'],
                ['accountage', "Displays the account age of your account or a user's account"],
                ['invite', 'Displays the invite links of the bot from which you can invite me in your server'],
                ['sponsor', 'Displays the information about the sponsors of the bot'],
                ['uptime', 'Displays the uptime of the bot'],
                ['botinfo', 'Displays the information about the bot'],
                ['ping', 'Displays the api latency'],
            ],
        },
        contact: {
            label: 'Contact',
            emojiName: 'falcon_contact',
            description: 'Contact us if you need support',
            title: 'Contact',
            subtitle: 'Get in touch with us',
            commands: [],
            body: `Need help with Zalcon? Join our support server!`,
        },
        help: {
            label: 'Help',
            emojiName: null,
            unicodeEmoji: '❓',
            description: 'Displays the help command',
            title: 'Help',
            subtitle: 'Displays the help command of the bot',
            commands: [
                ['help', 'Displays the help command of the bot'],
                ['setprefix', 'Changes the prefix of the bot for this guild'],
                ['deleteprefix', 'Resets the prefix of the bot to default for this guild'],
            ],
        },
    };
}

// Build the home help embed
export function buildHelpHome(prefix, client) {
    const cats = getCategories();
    const embed = new EmbedBuilder()
        .setColor(0x34c5be)
        .setTitle('Zalcon bot help panel')
        .setDescription(
            `Hey there , my prefix in this guild is ${prefix !== '-' ? `\`${prefix}\`` : '-'}\n\n` +
            `${emoji.news} News ${emoji.news}\n` +
            `${emoji.arrow} New Falcon Global Events broadcast feature is live Events Page. Want to advertise your events to large audience? Create it using /events create command and we will publish them to global events page!\n` +
            `${emoji.arrow} Upgrade your Discord server with Falcon Premium\n\n` +
            `I can do invite tracking, can manage your server events with greet system , timer ,polls and much more! You can checkout my other commands in the context menu!\n\n` +
            `${emoji.invites} Invite tracking\n` +
            `${emoji.messages} Messages\n` +
            `${emoji.giveaway} Giveaways\n` +
            `${emoji.greet} Greet\n` +
            `${emoji.timer} Timer\n` +
            `${emoji.moderation} Moderation\n` +
            `${emoji.poll} Poll\n` +
            `${emoji.utility} Utility\n` +
            `${emoji.contact} Contact`
        );

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category...')
        .addOptions(
            Object.entries(cats).map(([key, cat]) => {
                const option = {
                    label: cat.label,
                    value: key,
                    description: cat.description,
                };
                // Try to resolve a falcon custom emoji object first
                if (cat.emojiName) {
                    const emojiObj = resolveEmojiObject(cat.emojiName);
                    if (emojiObj) {
                        option.emoji = emojiObj;
                    }
                }
                // Fall back to unicode emoji if no custom emoji was found
                if (!option.emoji && cat.unicodeEmoji) {
                    option.emoji = cat.unicodeEmoji;
                }
                return option;
            })
        );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const SERVER_LINK = 'https://discord.gg/Yw6sTftAkh';
    const buttonRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Get Premium').setURL(SERVER_LINK).setStyle(ButtonStyle.Link),
        new ButtonBuilder().setLabel('Dashboard').setURL(SERVER_LINK).setStyle(ButtonStyle.Link),
        new ButtonBuilder().setLabel('Invite me').setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot+applications.commands`).setStyle(ButtonStyle.Link),
        new ButtonBuilder().setLabel('Support server').setURL(SERVER_LINK).setStyle(ButtonStyle.Link),
        new ButtonBuilder().setLabel('Vote me').setURL(SERVER_LINK).setStyle(ButtonStyle.Link),
    );
    const buttonRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('FAQs').setURL(SERVER_LINK).setStyle(ButtonStyle.Link),
    );

    return { embeds: [embed], components: [selectRow, buttonRow1, buttonRow2] };
}

// Build a category sub-view
export function buildHelpCategory(categoryKey, client) {
    const cats = getCategories();
    const cat = cats[categoryKey];
    if (!cat) return null;

    const container = new ContainerBuilder().setAccentColor(0x34c5be);

    // Resolve the emoji for display in the title
    const titleEmoji = cat.emojiName ? emoji.get(cat.emojiName) : (cat.unicodeEmoji || '');

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${titleEmoji} ${cat.title || cat.label}`),
    );

    if (cat.subtitle) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(cat.subtitle),
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    if (cat.body) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(cat.body),
        );
    }

    if (cat.commands && cat.commands.length > 0) {
        const lines = cat.commands.map(([cmd, desc]) => `${emoji.arrow} \`${cmd}\` - ${desc}`);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines.join('\n')),
        );
    }

    if (cat.note) {
        container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# ${cat.note}`),
        );
    }

    container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emoji.arrow} Discover new events [here](https://discord.gg/Yw6sTftAkh)!`),
    );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

class HelpCommand extends Command {
    constructor() {
        super({
            name: 'help',
            description: 'Displays the help command of the bot',
            aliases: ['h'],
            cooldown: 5,
            enabledSlash: true,
            shouldNotDefer: true,
            slashData: {
                name: 'help',
                description: 'Displays the help command of the bot',
            },
        });
    }

    async execute({ ctx }) {
        const guildPrefix = db.guild.getPrefix(ctx.guild.id) ?? '-';
        const { embeds, components } = buildHelpHome(guildPrefix, ctx.client);
        await ctx.reply({ embeds, components });
    }
}

export default new HelpCommand();
