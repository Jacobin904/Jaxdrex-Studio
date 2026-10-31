const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require('discord.js');

const { COLORS, LOGO_URL, BANNER_URL, STAFF_ROLES } = require('../config/constants');
const infractions = require('./infractions');

async function handleInteraction(interaction) {
    const id = interaction.customId || '';
    console.log('[Modpanel] Interaction received:', id, 'Type:', interaction.constructor.name);

    try {
        // ========== SELECT MENU PRINCIPAL ==========
        if (id === 'modpanel_menu' && interaction.isStringSelectMenu()) {
            const value = interaction.values[0];
            console.log('[Modpanel] Selected value:', value);

            if (value === 'mod_member_info') {
                const modal = new ModalBuilder()
                    .setCustomId('mod_member_info_modal')
                    .setTitle('Member Investigation');

                const userInput = new TextInputBuilder()
                    .setCustomId('mod_target')
                    .setLabel('Member (username, mention or ID)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: Username, @User or 123456789012345678')
                    .setMaxLength(100)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(userInput));
                console.log('[Modpanel] Showing modal for member info');
                return interaction.showModal(modal);
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
                        { name: 'Appeal Process', value: '1. Open a ticket for the appeal.\n2. Review the original moderation action.\n3. Consult with the moderator who issued it.\n4. Make a decision within 48 hours.\n5. Document the outcome.', inline: false }
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Moderation', iconURL: LOGO_URL })
                    .setTimestamp();

                console.log('[Modpanel] Sending guides embed');
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            if (value === 'mod_stats') {
                const guild = interaction.guild;
                const totalMembers = guild.memberCount;
                const staffCount = guild.members.cache.filter(m => m.roles.cache.some(r => STAFF_ROLES.includes(r.name))).size;
                const verifiedCount = guild.members.cache.filter(m => m.roles.cache.some(r => r.name === 'Verified')).size;
                const unverifiedCount = guild.members.cache.filter(m => m.roles.cache.some(r => r.name === 'Unverified')).size;
                const botCount = guild.members.cache.filter(m => m.user.bot).size;
                const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
                const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
                const rolesCount = guild.roles.cache.size;

                const embed = new EmbedBuilder()
                    .setColor(COLORS.darkRed)
                    .setTitle('Server Statistics')
                    .setDescription('Complete overview of the server activity and composition.')
                    .addFields(
                        { name: 'Member Breakdown', value: '**Total Members:** ' + totalMembers + '\n**Humans:** ' + (totalMembers - botCount) + '\n**Bots:** ' + botCount + '\n**Staff:** ' + staffCount + '\n**Verified:** ' + verifiedCount + '\n**Unverified:** ' + unverifiedCount, inline: true },
                        { name: 'Channel Breakdown', value: '**Text Channels:** ' + textChannels + '\n**Voice Channels:** ' + voiceChannels + '\n**Categories:** ' + guild.channels.cache.filter(c => c.type === 4).size + '\n**Total Channels:** ' + guild.channels.cache.size, inline: true },
                        { name: 'Server Info', value: '**Roles:** ' + rolesCount + '\n**Boost Level:** ' + guild.premiumTier + '\n**Boosts:** ' + guild.premiumSubscriptionCount + '\n**Created:** <t:' + Math.floor(guild.createdTimestamp / 1000) + ':R>', inline: true },
                        { name: 'Activity Metrics', value: '**Staff Ratio:** ' + ((staffCount / totalMembers) * 100).toFixed(1) + '%\n**Verification Rate:** ' + ((verifiedCount / (verifiedCount + unverifiedCount || 1)) * 100).toFixed(1) + '%\n**Average Members Per Role:** ' + (totalMembers / rolesCount).toFixed(1), inline: false }
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Statistics', iconURL: LOGO_URL })
                    .setTimestamp();

                console.log('[Modpanel] Sending stats embed');
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            if (value === 'mod_recent_logs') {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.darkRed)
                    .setTitle('Recent Moderation Logs')
                    .setDescription('All moderation actions are automatically logged in the dev-logs channel. This includes:\n\n• Member joins and leaves\n• Message deletions and edits\n• Role changes\n• Voice state changes\n• Channel modifications\n• Bans and unbans\n• Timeouts and warnings\n• Infractions issued and revoked\n• And much more...')
                    .addFields(
                        { name: 'Where To Find Logs', value: 'All events are logged in the #dev-logs channel with detailed embeds including timestamps, responsible moderators, and affected members.', inline: false },
                        { name: 'Log Retention', value: 'Logs are retained indefinitely in the dev-logs channel. For detailed analysis, use the ticket system to request a full audit.', inline: false }
                    )
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Logs', iconURL: LOGO_URL })
                    .setTimestamp();

                console.log('[Modpanel] Sending recent logs embed');
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }

        // ========== MODAL RECHERCHE MEMBRE ==========
        if (id === 'mod_member_info_modal' && interaction.isModalSubmit()) {
            const query = interaction.fields.getTextInputValue('mod_target');
            const clean = String(query).replace(/[<@!>]/g, '').trim();

            let member = null;

            if (/^\d{17,19}$/.test(clean)) {
                try {
                    member = await interaction.guild.members.fetch(clean);
                } catch (error) {
                    member = null;
                }
            }

            if (!member) {
                try {
                    await interaction.guild.members.fetch();
                } catch (error) {}

                member = interaction.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === clean.toLowerCase() ||
                    m.user.tag.toLowerCase() === clean.toLowerCase() ||
                    (m.nickname && m.nickname.toLowerCase() === clean.toLowerCase())
                ) || null;
            }

            if (!member) {
                return interaction.reply({
                    content: 'Member not found. Please check the username, mention, or ID and try again.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const isStaff = member.roles.cache.some(r => STAFF_ROLES.includes(r.name));
            const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'None';

            const timeoutExpires = member.communicationDisabledUntilTimestamp;
            const timeoutInfo = timeoutExpires && timeoutExpires > Date.now()
                ? '<t:' + Math.floor(timeoutExpires / 1000) + ':R>'
                : 'None';

            const infractionCount = infractions.getInfractionCount(member.id);

            const embed = new EmbedBuilder()
                .setColor(isStaff ? COLORS.darkRed : COLORS.dark)
                .setTitle('Member Investigation')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'User', value: member.user.tag + '\n' + member.user.id, inline: true },
                    { name: 'Nickname', value: member.nickname || 'None', inline: true },
                    { name: 'Bot', value: member.user.bot ? 'Yes' : 'No', inline: true },
                    { name: 'Account Created', value: '<t:' + Math.floor(member.user.createdTimestamp / 1000) + ':R>', inline: false },
                    { name: 'Joined Server', value: '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>', inline: false },
                    { name: 'Is Staff', value: isStaff ? 'Yes' : 'No', inline: true },
                    { name: 'Current Timeout', value: timeoutInfo, inline: true },
                    { name: 'Infractions', value: '**Total:** ' + infractionCount.total + '\n**Active:** ' + infractionCount.active + '\n**Revoked:** ' + infractionCount.revoked, inline: true },
                    { name: 'Roles (' + member.roles.cache.size + ')', value: roles.substring(0, 1000) || 'None', inline: false }
                )
                .setImage(BANNER_URL)
                .setFooter({ text: 'Jaxdrax Studio Investigation | Use the selector below for actions', iconURL: LOGO_URL })
                .setTimestamp();

            const actionMenu = new StringSelectMenuBuilder()
                .setCustomId('mod_action_menu_' + member.id)
                .setPlaceholder('Select a moderation action for ' + member.user.username + '...')
                .addOptions(
                    { label: 'Warn Member', value: 'mod_action_warn_' + member.id, description: 'Issue an official warning (logged)' },
                    { label: 'Timeout Member', value: 'mod_action_timeout_' + member.id, description: 'Temporarily restrict communication' },
                    { label: 'Kick Member', value: 'mod_action_kick_' + member.id, description: 'Remove from server (can rejoin)' },
                    { label: 'Ban Member', value: 'mod_action_ban_' + member.id, description: 'Permanent removal from server' },
                    { label: 'View Infractions', value: 'mod_view_infractions_' + member.id, description: 'View all infractions for this member' }
                );

            const row = new ActionRowBuilder().addComponents(actionMenu);

            console.log('[Modpanel] Sending member info with action menu');
            return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        }

        // ========== SELECTION D'UNE ACTION ==========
        if (id.startsWith('mod_action_menu_') && interaction.isStringSelectMenu()) {
            const value = interaction.values[0];
            console.log('[Modpanel] Action selected:', value);

            // ========== VOIR LES INFRACTIONS ==========
            if (value.startsWith('mod_view_infractions_')) {
                const targetId = value.replace('mod_view_infractions_', '');
                const userInfractions = infractions.getUserInfractions(targetId);

                if (userInfractions.length === 0) {
                    return interaction.reply({
                        content: 'This member has no infractions.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                let description = '**Total Infractions:** ' + userInfractions.length + '\n\n';

                for (const inf of userInfractions.slice(0, 10)) {
                    const moderator = await interaction.client.users.fetch(inf.moderatorId).catch(() => null);
                    const moderatorName = moderator ? moderator.tag : 'Unknown';
                    const date = '<t:' + Math.floor(new Date(inf.createdAt).getTime() / 1000) + ':R>';

                    if (inf.revoked) {
                        const revoker = await interaction.client.users.fetch(inf.revokedBy).catch(() => null);
                        const revokerName = revoker ? revoker.tag : 'Unknown';
                        const revokeDate = '<t:' + Math.floor(new Date(inf.revokedAt).getTime() / 1000) + ':R>';

                        description += '~~**[' + inf.id + ']** ' + inf.type.charAt(0).toUpperCase() + inf.type.slice(1) + ' by ' + moderatorName + ' on ' + date + '~~\n';
                        description += '~~Reason: ' + inf.reason.substring(0, 100) + '~~\n';
                        description += '~~**REVOKED** by ' + revokerName + ' on ' + revokeDate + ': ' + inf.revokeReason + '~~\n\n';
                    } else {
                        description += '**[' + inf.id + ']** ' + inf.type.charAt(0).toUpperCase() + inf.type.slice(1) + ' by ' + moderatorName + ' on ' + date + '\n';
                        description += 'Reason: ' + inf.reason.substring(0, 100) + '\n\n';
                    }
                }

                if (userInfractions.length > 10) {
                    description += '\n*... and ' + (userInfractions.length - 10) + ' more infractions. Use the revoke system to manage specific infractions by ID.*';
                }

                const embed = new EmbedBuilder()
                    .setColor(COLORS.darkRed)
                    .setTitle('Member Infractions')
                    .setDescription(description)
                    .setImage(BANNER_URL)
                    .setFooter({ text: 'Jaxdrax Studio Infraction System', iconURL: LOGO_URL })
                    .setTimestamp();

                const revokeButton = new ButtonBuilder()
                    .setCustomId('mod_revoke_infraction_' + targetId)
                    .setLabel('Revoke Infraction')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(revokeButton);

                return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
            }

            const match = value.match(/^mod_action_(warn|timeout|kick|ban)_(\d+)$/);

            if (!match) {
                return interaction.reply({ content: 'Invalid action selected.', flags: MessageFlags.Ephemeral });
            }

            const actionType = match[1];
            const targetId = match[2];

            let member;
            try {
                member = await interaction.guild.members.fetch(targetId);
            } catch (error) {
                return interaction.reply({ content: 'Target member not found.', flags: MessageFlags.Ephemeral });
            }

            const modal = new ModalBuilder()
                .setCustomId('mod_action_modal_' + actionType + '_' + targetId)
                .setTitle('Execute ' + actionType.charAt(0).toUpperCase() + actionType.slice(1) + ' on ' + member.user.username);

            const reasonInput = new TextInputBuilder()
                .setCustomId('mod_reason')
                .setLabel('Reason')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain why this action is being taken.')
                .setMaxLength(500)
                .setRequired(true);

            const rows = [new ActionRowBuilder().addComponents(reasonInput)];

            if (actionType === 'timeout') {
                const durationInput = new TextInputBuilder()
                    .setCustomId('mod_duration')
                    .setLabel('Duration (e.g. 1h, 24h, 7d)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 1h, 24h, 7d')
                    .setRequired(true);
                rows.unshift(new ActionRowBuilder().addComponents(durationInput));
            }

            modal.addComponents(...rows);
            return interaction.showModal(modal);
        }

        // ========== REVOQUER UNE INFRACTION ==========
        if (id.startsWith('mod_revoke_infraction_') && interaction.isButton()) {
            const targetId = id.replace('mod_revoke_infraction_', '');

            const modal = new ModalBuilder()
                .setCustomId('mod_revoke_modal_' + targetId)
                .setTitle('Revoke Infraction');

            const infractionIdInput = new TextInputBuilder()
                .setCustomId('infraction_id')
                .setLabel('Infraction ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: INF-1234567890-1234')
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('revoke_reason')
                .setLabel('Reason for Revocation')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Explain why this infraction is being revoked.')
                .setMaxLength(500)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(infractionIdInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );

            return interaction.showModal(modal);
        }

        // ========== EXECUTION DE LA REVOCATION ==========
        if (id.startsWith('mod_revoke_modal_') && interaction.isModalSubmit()) {
            const infractionId = interaction.fields.getTextInputValue('infraction_id');
            const revokeReason = interaction.fields.getTextInputValue('revoke_reason');

            const result = await infractions.revokeInfraction(infractionId, interaction.user.id, revokeReason);

            if (!result.success) {
                return interaction.reply({
                    content: 'Failed to revoke infraction: ' + result.error,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Logger la révocation
            try {
                const logger = require('./logger');
                await logger.logInfractionRevoked(interaction.guild, interaction.user, result.infraction, revokeReason);
            } catch (logError) {
                console.error('[Modpanel] Log failed:', logError.message);
            }

            return interaction.reply({
                content: 'Infraction **' + infractionId + '** has been successfully revoked.\n\n**Reason:** ' + revokeReason,
                flags: MessageFlags.Ephemeral
            });
        }

        // ========== EXECUTION DE L'ACTION ==========
        if (id.startsWith('mod_action_modal_') && interaction.isModalSubmit()) {
            const match = id.match(/^mod_action_modal_(warn|timeout|kick|ban)_(\d+)$/);
            if (!match) return;

            const actionType = match[1];
            const targetId = match[2];
            const reason = interaction.fields.getTextInputValue('mod_reason');

            let member;
            try {
                member = await interaction.guild.members.fetch(targetId);
            } catch (error) {
                return interaction.reply({ content: 'Target member not found.', flags: MessageFlags.Ephemeral });
            }

            try {
                let resultMessage = '';

                if (actionType === 'warn') {
                    // Ajouter une infraction
                    const infraction = await infractions.addInfraction(member.id, interaction.user.id, 'warn', reason);
                    resultMessage = 'Warning issued to ' + member.user.tag + ' for: ' + reason + '\n\n**Infraction ID:** ' + infraction.id;
                } else if (actionType === 'timeout') {
                    const durationStr = interaction.fields.getTextInputValue('mod_duration');
                    const durMatch = durationStr.match(/^(\d+)(m|h|d)$/);
                    if (!durMatch) {
                        return interaction.reply({ content: 'Invalid duration format. Use 1h, 24h, or 7d.', flags: MessageFlags.Ephemeral });
                    }
                    const amount = parseInt(durMatch[1]);
                    const unit = durMatch[2];
                    let ms = amount * 60 * 1000;
                    if (unit === 'h') ms *= 60;
                    if (unit === 'd') ms *= 24 * 60 * 60 * 1000;

                    await member.timeout(ms, reason);
                    
                    // Ajouter une infraction
                    const infraction = await infractions.addInfraction(member.id, interaction.user.id, 'timeout', reason + ' (Duration: ' + durationStr + ')');
                    resultMessage = 'Timeout applied to ' + member.user.tag + ' for ' + durationStr + '. Reason: ' + reason + '\n\n**Infraction ID:** ' + infraction.id;
                } else if (actionType === 'kick') {
                    await member.kick(reason);
                    
                    // Ajouter une infraction
                    const infraction = await infractions.addInfraction(member.id, interaction.user.id, 'kick', reason);
                    resultMessage = member.user.tag + ' has been kicked. Reason: ' + reason + '\n\n**Infraction ID:** ' + infraction.id;
                } else if (actionType === 'ban') {
                    await member.ban({ reason: reason, deleteMessageSeconds: 0 });
                    
                    // Ajouter une infraction
                    const infraction = await infractions.addInfraction(member.id, interaction.user.id, 'ban', reason);
                    resultMessage = member.user.tag + ' has been banned. Reason: ' + reason + '\n\n**Infraction ID:** ' + infraction.id;
                }

                try {
                    const logger = require('./logger');
                    await logger.logModerationAction(interaction.guild, interaction.user, member.user, actionType, reason);
                } catch (logError) {
                    console.error('[Modpanel] Log failed:', logError.message);
                }

                console.log('[Modpanel] Action executed:', actionType, 'on', member.user.tag);
                return interaction.reply({ content: resultMessage, flags: MessageFlags.Ephemeral });
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
