import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { db } from '#dbManager';

class ResetMyMessagesCommand extends Command {
        constructor() {
                super({
                        name: 'resetmymessages',
                        description: 'Reset your own message count in this server',
                        aliases: ["rmm","clearmymessages","clearmymessage"],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'resetmymessages',
                                description: 'Reset your own message count in this server',
                        },
                });
        }

        async execute({ ctx }) {
                await db.userMessageCounter?.resetCount(ctx.guild.id, ctx.member.id);

                const container = new ContainerBuilder();
                container.setAccentColor(0x34c5be);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Success**`),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `${ctx.member.displayName}, I have successfully reset your messages in this guild`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new ResetMyMessagesCommand();

