const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require('discord.js');

const { COLORS, LOGO_URL, BANNER_URL, STAFF_ROLES } = require('../config/constants');
const infractions = require('./infractions');

function clamp(text, max) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (value.length <= max) return value || 'No reason provided';
    return value.substring(0, max - 3) + '...';
}

function shortDate(iso) {
    try {
        return new Date(iso).toISOString().substring(0, 10);
    } catch (error) {
        return 'Unknown date';
    }
}

function relative(iso) {
    try {
        return '<t:' + Math.floor(new Date(iso).getTime() / 1000) + ':R>';
    } catch (error) {
        return 'Unknown';
    }
}

function capitalize(text) {
    const value = String(text || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
}

async function buildMemberPanel(interaction, member) {
    const isStaff = member.roles.cache.some(r => STAFF_ROLES.includes(r.name));
    const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'None';

    const timeoutExpires = member.communicationDisabledUntilTimestamp;
    const timeoutInfo = timeoutExpires && timeoutExpires > Date.now()
        ? '<t:' + Math.floor(timeoutExpires / 1000) + ':R>'
        : 'None';

    const counts = infractions.getInfractionCount(member.id);

    const embed = new EmbedBuilder()
        .setColor(isStaff ? COLORS.darkRed : COLORS.dark)
        .setTitle('Member Investigation')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: member.user.tag + '\n' + member.user.id, inline: true },
            { name: 'Nickname', value: member.nickname || 'None', inline: true },
            { name: 'Bot', value: member.user.bot ? 'Yes' : 'No', inline: true },
            { name: 'Account Created', value: '<t:' + Math.floor(member.user.createdTimestamp / 1000) + ':R>', inline: true },
            { name: 'Joined Server', value: member.joinedTimestamp ? '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>' : 'Unknown', inline: true },
            { name: 'Is Staff', value: isStaff ? 'Yes' : 'No', inline: true },
            { name: 'Current Timeout', value: timeoutInfo, inline: true },
            { name: 'Infractions', value: '**Total:** ' + counts.total + '\n**Active:** ' + counts.active + '\n**Revoked:** ' + counts.revoked, inline: true },
            { name: 'Roles (' + member.roles.cache.size + ')', value: roles.substring(0, 1000), inline: false }
        )
        .setImage(BANNER_URL)
        .setFooter({ text: 'Jaxdrax Studio Investigation | Use the selector below for actions', iconURL: LOGO_URL })
        .setTimestamp();

    const actionMenu = new StringSelectMenuBuilder()
        .setCustomId('mod_action_menu_' + member.id)
        .setPlaceholder('Select an action for ' + clamp(member.user.username, 40))
        .addOptions(
            { label: 'View Infractions', value: 'mod_view_infractions_' + member.id, description: 'View the full infraction history and revoke entries' },
            { label: 'Warn Member', value: 'mod_action_warn_' + member.id, description: 'Issue an official warning (creates an infraction ID)' },
            { label: 'Timeout Member', value: 'mod_action_timeout_' + member.id, description: 'Temporarily restrict communication' },
            { label: 'Kick Member', value: 'mod_action_kick_' + member.id, description: 'Remove from the server (can rejoin)' },
            { label: 'Ban Member', value: 'mod_action_ban_' + member.id, description: 'Permanent removal from the server' }
        );

    return {
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(actionMenu)],
        flags: MessageFlags.Ephemeral
    };
}

async function buildInfractionList(interaction, targetId) {
    const list = infractions.getUserInfractions(targetId);
    const user = await interaction.client.users.fetch(targetId).catch(() => null);
    const counts = infractions.getInfractionCount(targetId);

    if (list.length === 0) {
        const emptyEmbed = new EmbedBuilder()
            .setColor(COLORS.dark)
            .setTitle('Infraction History')
            .setDescription('**User:** ' + (user ? user.tag : targetId) + '\n\nThis member has no recorded infractions.')
            .setImage(BANNER_URL)
            .setFooter({ text: 'Jaxdrax Studio Infraction System', iconURL: LOGO_URL })
            .setTimestamp();

        return { embeds: [emptyEmbed], components: [], flags: MessageFlags.Ephemeral };
    }

    let description = '**User:** ' + (user ? user.tag : targetId) + '\n';
    description += '**Total:** ' + counts.total + ' | **Active:** ' + counts.active + ' | **Revoked:** ' + counts.revoked + '\n\n';

    const sorted = list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    for (const inf of sorted.slice(0, 10)) {
        const moderator = await interaction.client.users.fetch(inf.moderatorId).catch(() => null);
        const moderatorName = moderator ? moderator.tag : 'Unknown';

        const header = '**[' + inf.id + ']** ' + capitalize(inf.type) + ' by ' + moderatorName + ' ' + relative(inf.createdAt);
        const reasonLine = 'Reason: ' + clamp(inf.reason, 150);

        if (inf.revoked) {
            description += '~~' + header + '~~\n';
            description += '~~' + reasonLine + '~~\n';

            const revoker = await interaction.client.users.fetch(inf.revokedBy).catch(() => null);
            const revokerName = revoker ? revoker.tag : 'Unknown';
            description += '**REVOKED** by ' + revokerName + ' ' + relative(inf.revokedAt) + '\n';
            description += 'Revocation reason: ' + clamp(inf.revokeReason, 150) + '\n\n';
        } else {
            description += header + '\n';
            description += reasonLine + '\n\n';
        }
    }

    if (sorted.length > 10) {
        description += '*Showing the 10 most recent entries out of ' + sorted.length + '. All active infractions remain available in the revocation selector.*';
    }

    const embed = new EmbedBuilder()
        .setColor(COLORS.darkRed)
        .setTitle('Infraction History')
        .setDescription(description.substring(0, 4000))
        .setImage(BANNER_URL)
        .setFooter({ text: 'Jaxdrax Studio Infraction System', iconURL: LOGO_URL })
        .setTimestamp();

    const active = sorted.filter(inf => !inf.revoked).slice(0, 25);
    const components = [];

    if (active.length > 0) {
        const revokeMenu = new StringSelectMenuBuilder()
            .setCustomId('mod_revoke_select_' + targetId)
            .setPlaceholder('Select an infraction ID to revoke...')
            .addOptions(
                active.map(inf => ({
                    label: clamp(inf.id, 100),
                    value: inf.id,
                    description: clamp(capitalize(inf.type) + ' | ' + shortDate(inf.createdAt) + ' | ' + inf.reason, 100)
                }))
            );

        components.push(new ActionRowBuilder().addComponents(revokeMenu));
    } else {
        embed.addFields({
            name: 'Nothing To Revoke',
            value: 'Every infraction on this member has already been revoked.',
            inline: false
        });
    }

    return { embeds: [embed], components: components, flags: MessageFlags.Ephemeral };
}

async function handleInteraction(interaction) {
    const id = interaction.customId || '';
    console.log('[Modpanel] Interaction received:', id);

    try {
        // ========== MENU PRINCIPAL ==========
        if (id === 'modpanel_menu' && interaction.isStringSelectMenu()) {
            const value = interaction.values[0];

            if (value === 'mod_member_info') {
                const userMenu = new UserSelectMenuBuilder()
                    .setCustomId('mod_user_select')
                    .setPlaceholder('Search and select a server member...')
                    .setMinValues(1)
                    .setMaxValues(1);

                const embed = new EmbedBuilder()
                    .setColor(COLORS.dark)
                    .setTitle('Member Investigation')
                    .setDescription(
                        'Use the selector below to pick a member of this server.\n\n' +
                        'You can type a username, a display name or paste an ID directly in the selector. ' +
                        'Once a member is selected, the full profile and the moderation actions will be displayed.'
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Investigation', iconURL: LOGO_URL })
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(userMenu)],
                    flags: MessageFlags.Ephemeral
                });
            }

            if (value === 'mod_guides') {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.darkRed)
                    .setTitle('Moderation Guides')
                    .setDescription('Step-by-step procedures for handling common situations. Always document actions and follow the escalation path.')
                    .addFields(
                        { name: 'Spam Handling', value: '1. Delete the spam messages immediately.\n2. Timeout the user for 1 hour.\n3. Send a warning DM explaining the violation.\n4. Log the action in dev-logs.\n5. If spam continues, escalate to a ban.', inline: false },
                        { name: 'Harassment Response', value: '1. Preserve evidence (screenshots).\n2. Timeout the offender for 24 hours.\n3. Open a support ticket for the victim.\n4. Notify Game Direction or Admin.\n5. Consider a permanent ban based on severity.', inline: false },
                        { name: 'Exploit Reports', value: '1. Ask the reporter for details privately.\n2. Verify the exploit exists.\n3. Document the exploit steps.\n4. Notify the Developer role immediately.\n5. Ban any users who shared the exploit publicly.', inline: false },
                        { name: 'Raid Response', value: '1. Enable raid mode (lock all public channels).\n2. Ban all raid participants.\n3. Delete raid messages.\n4. Notify all staff via @Staff Team.\n5. Reopen channels once safe.', inline: false },
                        { name: 'Appeal Process', value: '1. Open a ticket for the appeal.\n2. Review the original moderation action.\n3. Consult with the moderator who issued it.\n4. Make a decision within 48 hours.\n5. Document the outcome and revoke the infraction if the appeal is accepted.', inline: false }
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Moderation', iconURL: LOGO_URL })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            if (value === 'mod_stats') {
                const guild = interaction.guild;
                const totalMembers = guild.memberCount;
                const staffCount = guild.members.cache.filter(m => m.roles.cache.some(r => STAFF_ROLES.includes(r.name))).size;
                const verifiedCount = guild.members.cache.filter(m => m.roles.cache.some(r => r.name === 'Verified')).size;
                const unverifiedCount = guild.members.cache.filter(m => m.roles.cache.some(r => r.name === 'Unverified')).size;
                const botCount = guild.members.cache.filter(m => m.user.bot).size;
                const all = infractions.loadInfractions();
                const activeInfractions = all.filter(inf => !inf.revoked).length;
                const revokedInfractions = all.filter(inf => inf.revoked).length;

                const embed = new EmbedBuilder()
                    .setColor(COLORS.darkRed)
                    .setTitle('Server Statistics')
                    .setDescription('Complete overview of the server activity and composition.')
                    .addFields(
                        { name: 'Member Breakdown', value: '**Total Members:** ' + totalMembers + '\n**Humans:** ' + (totalMembers - botCount) + '\n**Bots:** ' + botCount + '\n**Staff:** ' + staffCount + '\n**Verified:** ' + verifiedCount + '\n**Unverified:** ' + unverifiedCount, inline: true },
                        { name: 'Channel Breakdown', value: '**Text Channels:** ' + guild.channels.cache.filter(c => c.type === 0).size + '\n**Voice Channels:** ' + guild.channels.cache.filter(c => c.type === 2).size + '\n**Categories:** ' + guild.channels.cache.filter(c => c.type === 4).size + '\n**Total Channels:** ' + guild.channels.cache.size, inline: true },
                        { name: 'Server Info', value: '**Roles:** ' + guild.roles.cache.size + '\n**Boost Level:** ' + guild.premiumTier + '\n**Boosts:** ' + (guild.premiumSubscriptionCount || 0) + '\n**Created:** <t:' + Math.floor(guild.createdTimestamp / 1000) + ':R>', inline: true },
                        { name: 'Infraction System', value: '**Total recorded:** ' + all.length + '\n**Active:** ' + activeInfractions + '\n**Revoked:** ' + revokedInfractions, inline: true },
                        { name: 'Activity Metrics', value: '**Staff Ratio:** ' + ((staffCount / (totalMembers || 1)) * 100).toFixed(1) + '%\n**Verification Rate:** ' + ((verifiedCount / ((verifiedCount + unverifiedCount) || 1)) * 100).toFixed(1) + '%', inline: true }
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Statistics', iconURL: LOGO_URL })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            if (value === 'mod_recent_logs') {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.darkRed)
                    .setTitle('Recent Moderation Logs')
                    .setDescription('All server activity is automatically logged in the dev-logs channel.')
                    .addFields(
                        { name: 'Logged Events', value: '• Member joins, leaves and profile updates\n• Message deletions, edits and bulk purges\n• Role creations, deletions and permission changes\n• Voice joins, leaves, moves, mute and deafen\n• Channel creations, deletions and updates\n• Bans, unbans and timeouts\n• Emoji, sticker, invite and thread changes\n• Infractions issued and revoked', inline: false },
                        { name: 'Log Retention', value: 'Logs are retained indefinitely in the dev-logs channel. For a detailed audit, open a ticket and request the specific time range.', inline: false }
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Logs', iconURL: LOGO_URL })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }

        // ========== SELECTEUR D'UTILISATEUR NATIF ==========
        if (id === 'mod_user_select' && interaction.isUserSelectMenu()) {
            const targetId = interaction.values[0];

            let member = null;
            try {
                member = await interaction.guild.members.fetch(targetId);
            } catch (error) {
                member = null;
            }

            if (!member) {
                return interaction.reply({
                    content: 'That user is not a member of this server. Please select someone else.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const payload = await buildMemberPanel(interaction, member);
            return interaction.reply(payload);
        }

        // ========== ANCIEN MODAL DE RECHERCHE (compatibilité) ==========
        if (id === 'mod_member_info_modal' && interaction.isModalSubmit()) {
            const query = interaction.fields.getTextInputValue('mod_target');
            const clean = String(query).replace(/[<@!>]/g, '').trim();

            let member = null;

            if (/^\d{17,20}$/.test(clean)) {
                member = await interaction.guild.members.fetch(clean).catch(() => null);
            }

            if (!member) {
                await interaction.guild.members.fetch().catch(() => {});
                member = interaction.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === clean.toLowerCase() ||
                    m.user.tag.toLowerCase() === clean.toLowerCase() ||
                    (m.nickname && m.nickname.toLowerCase() === clean.toLowerCase())
                ) || null;
            }

            if (!member) {
                return interaction.reply({
                    content: 'Member not found. Use the member selector instead for a reliable lookup.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const payload = await buildMemberPanel(interaction, member);
            return interaction.reply(payload);
        }

        // ========== MENU D'ACTIONS SUR UN MEMBRE ==========
        if (id.startsWith('mod_action_menu_') && interaction.isStringSelectMenu()) {
            const value = interaction.values[0];

            if (value.startsWith('mod_view_infractions_')) {
                const targetId = value.replace('mod_view_infractions_', '');
                const payload = await buildInfractionList(interaction, targetId);
                return interaction.reply(payload);
            }

            const match = value.match(/^mod_action_(warn|timeout|kick|ban)_(\d+)$/);
            if (!match) {
                return interaction.reply({ content: 'Invalid action selected.', flags: MessageFlags.Ephemeral });
            }

            const actionType = match[1];
            const targetId = match[2];

            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (!member) {
                return interaction.reply({ content: 'Target member not found.', flags: MessageFlags.Ephemeral });
            }

            const modal = new ModalBuilder()
                .setCustomId('mod_action_modal_' + actionType + '_' + targetId)
                .setTitle(clamp(capitalize(actionType) + ' - ' + member.user.username, 45));

            const reasonInput = new TextInputBuilder()
                .setCustomId('mod_reason')
                .setLabel('Reason')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain why this action is being taken.')
                .setMaxLength(500)
                .setRequired(true);

            const rows = [];

            if (actionType === 'timeout') {
                rows.push(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('mod_duration')
                        .setLabel('Duration (e.g. 30m, 1h, 24h, 7d)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('Ex: 1h, 24h, 7d')
                        .setMaxLength(10)
                        .setRequired(true)
                ));
            }

            rows.push(new ActionRowBuilder().addComponents(reasonInput));
            modal.addComponents(...rows);

            return interaction.showModal(modal);
        }

        // ========== SELECTEUR D'INFRACTION A REVOQUER ==========
        if (id.startsWith('mod_revoke_select_') && interaction.isStringSelectMenu()) {
            const targetId = id.replace('mod_revoke_select_', '');
            const infractionId = interaction.values[0];

            const infraction = infractions.getInfractionById(infractionId);

            if (!infraction) {
                return interaction.reply({ content: 'That infraction no longer exists.', flags: MessageFlags.Ephemeral });
            }

            if (infraction.revoked) {
                return interaction.reply({ content: 'That infraction has already been revoked.', flags: MessageFlags.Ephemeral });
            }

            const modal = new ModalBuilder()
                .setCustomId('mod_revoke_modal_' + infractionId)
                .setTitle('Revoke Infraction');

            const reasonInput = new TextInputBuilder()
                .setCustomId('revoke_reason')
                .setLabel('Reason for revocation')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain why this infraction is being cancelled.')
                .setMaxLength(500)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            return interaction.showModal(modal);
        }

        // ========== EXECUTION DE LA REVOCATION ==========
        if (id.startsWith('mod_revoke_modal_') && interaction.isModalSubmit()) {
            const infractionId = id.replace('mod_revoke_modal_', '');
            const revokeReason = interaction.fields.getTextInputValue('revoke_reason');

            const result = await infractions.revokeInfraction(infractionId, interaction.user.id, revokeReason);

            if (!result.success) {
                return interaction.reply({
                    content: 'Failed to revoke infraction: ' + result.error,
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const logger = require('./logger');
                if (typeof logger.logInfractionRevoked === 'function') {
                    await logger.logInfractionRevoked(interaction.guild, interaction.user, result.infraction, revokeReason);
                }
            } catch (logError) {
                console.error('[Modpanel] Log failed:', logError.message);
            }

            const targetId = result.infraction.userId;
            const payload = await buildInfractionList(interaction, targetId);

            return interaction.reply({
                content: 'Infraction **' + infractionId + '** has been revoked.',
                embeds: payload.embeds,
                components: payload.components,
                flags: MessageFlags.Ephemeral
            });
        }

        // ========== EXECUTION D'UNE ACTION DE MODERATION ==========
        if (id.startsWith('mod_action_modal_') && interaction.isModalSubmit()) {
            const match = id.match(/^mod_action_modal_(warn|timeout|kick|ban)_(\d+)$/);
            if (!match) return;

            const actionType = match[1];
            const targetId = match[2];
            const reason = interaction.fields.getTextInputValue('mod_reason');

            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (!member) {
                return interaction.reply({ content: 'Target member not found.', flags: MessageFlags.Ephemeral });
            }

            try {
                let resultMessage = '';
                let storedReason = reason;

                if (actionType === 'timeout') {
                    const durationStr = interaction.fields.getTextInputValue('mod_duration').trim();
                    const durMatch = durationStr.match(/^(\d+)(m|h|d)$/i);

                    if (!durMatch) {
                        return interaction.reply({
                            content: 'Invalid duration format. Use 30m, 1h, 24h or 7d.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    const amount = parseInt(durMatch[1], 10);
                    const unit = durMatch[2].toLowerCase();
                    let ms = amount * 60 * 1000;
                    if (unit === 'h') ms *= 60;
                    if (unit === 'd') ms *= 1440;

                    if (ms > 28 * 24 * 60 * 60 * 1000) {
                        return interaction.reply({
                            content: 'Discord limits timeouts to 28 days maximum.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    await member.timeout(ms, reason);
                    storedReason = reason + ' (Duration: ' + durationStr + ')';
                    resultMessage = 'Timeout applied to ' + member.user.tag + ' for ' + durationStr + '.';
                } else if (actionType === 'kick') {
                    await member.kick(reason);
                    resultMessage = member.user.tag + ' has been kicked.';
                } else if (actionType === 'ban') {
                    await member.ban({ reason: reason, deleteMessageSeconds: 0 });
                    resultMessage = member.user.tag + ' has been banned.';
                } else {
                    resultMessage = 'Warning issued to ' + member.user.tag + '.';
                }

                const infraction = await infractions.addInfraction(member.id, interaction.user.id, actionType, storedReason);

                try {
                    const logger = require('./logger');
                    if (typeof logger.logModerationAction === 'function') {
                        await logger.logModerationAction(interaction.guild, interaction.user, member.user, actionType, storedReason);
                    }
                } catch (logError) {
                    console.error('[Modpanel] Log failed:', logError.message);
                }

                const confirmEmbed = new EmbedBuilder()
                    .setColor(COLORS.darkRed)
                    .setTitle('Moderation Action Executed')
                    .setDescription(resultMessage)
                    .addFields(
                        { name: 'Infraction ID', value: infraction.id, inline: true },
                        { name: 'Action', value: capitalize(actionType), inline: true },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Target', value: member.user.tag + '\n' + member.id, inline: true },
                        { name: 'Reason', value: clamp(storedReason, 1000), inline: false }
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Moderation', iconURL: LOGO_URL })
                    .setTimestamp();

                return interaction.reply({ embeds: [confirmEmbed], flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error('[Modpanel] Action failed:', error.message);
                return interaction.reply({ content: 'Action failed: ' + error.message, flags: MessageFlags.Ephemeral });
            }
        }
    } catch (error) {
        console.error('[Modpanel] Interaction error:', error.message, error.stack);
    }
}

module.exports = { handleInteraction };
