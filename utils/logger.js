const { EmbedBuilder } = require('discord.js');
const { COLORS, LOGO_URL } = require('../config/constants');

const LOG_CHANNEL_NAME = 'dev-logs';

function getLogChannel(guild) {
    return guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME && c.isTextBased()) || null;
}

async function sendLog(guild, embed) {
    try {
        const channel = getLogChannel(guild);
        if (!channel) return;
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('[Logger] Send failed:', error.message);
    }
}

function truncate(text, max = 1000) {
    if (!text) return 'None';
    const str = String(text);
    return str.length > max ? str.substring(0, max - 20) + '\n... (truncated)' : str;
}

// ========== MEMBRES ==========
async function logMemberJoin(member) {
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Member Joined')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: member.user.tag, inline: true },
            { name: 'ID', value: member.id, inline: true },
            { name: 'Account Created', value: '<t:' + Math.floor(member.user.createdTimestamp / 1000) + ':R>', inline: false },
            { name: 'Total Members', value: String(member.guild.memberCount), inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(member.guild, embed);
}

async function logMemberLeave(member) {
    const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'None';
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Member Left')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: member.user.tag, inline: true },
            { name: 'ID', value: member.id, inline: true },
            { name: 'Joined', value: member.joinedAt ? '<t:' + Math.floor(member.joinedTimestamp / 1000) + ':R>' : 'Unknown', inline: false },
            { name: 'Roles', value: truncate(roles, 500), inline: false },
            { name: 'Total Members', value: String(member.guild.memberCount), inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(member.guild, embed);
}

// ========== MESSAGES ==========
async function logMessageDelete(message) {
    if (!message.guild || message.author?.bot) return;
    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('Message Deleted')
        .addFields(
            { name: 'Author', value: message.author ? message.author.tag : 'Unknown', inline: true },
            { name: 'Channel', value: message.channel.toString(), inline: true },
            { name: 'Content', value: truncate(message.content || '[No text content]', 1000), inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    if (message.attachments.size > 0) {
        embed.addFields({ name: 'Attachments', value: message.attachments.map(a => a.url).join('\n').substring(0, 1000), inline: false });
    }
    await sendLog(message.guild, embed);
}

async function logMessageUpdate(oldMessage, newMessage) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('Message Edited')
        .addFields(
            { name: 'Author', value: oldMessage.author.tag, inline: true },
            { name: 'Channel', value: oldMessage.channel.toString(), inline: true },
            { name: 'Jump to Message', value: '[Click here](' + newMessage.url + ')', inline: true },
            { name: 'Before', value: truncate(oldMessage.content || '[No content]', 500), inline: false },
            { name: 'After', value: truncate(newMessage.content || '[No content]', 500), inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(oldMessage.guild, embed);
}

async function logMessageBulkDelete(messages, channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setColor('#c0392b')
        .setTitle('Bulk Message Delete')
        .addFields(
            { name: 'Channel', value: channel.toString(), inline: true },
            { name: 'Messages Deleted', value: String(messages.size), inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(channel.guild, embed);
}

// ========== VOIX ==========
async function logVoiceState(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guild = member.guild;
    let title = 'Voice State Change';
    let color = '#3498db';
    let description = '';

    // Join
    if (!oldState.channel && newState.channel) {
        title = 'Voice Channel Join';
        color = '#2ecc71';
        description = member.user.tag + ' joined ' + newState.channel.toString();
    }
    // Leave
    else if (oldState.channel && !newState.channel) {
        title = 'Voice Channel Leave';
        color = '#e74c3c';
        description = member.user.tag + ' left ' + oldState.channel.toString();
    }
    // Move
    else if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
        title = 'Voice Channel Move';
        color = '#9b59b6';
        description = member.user.tag + ' moved from ' + oldState.channel.toString() + ' to ' + newState.channel.toString();
    }
    // Mute/Deafen
    else {
        const changes = [];
        if (oldState.selfMute !== newState.selfMute) changes.push('Self Mute: ' + (newState.selfMute ? 'ON' : 'OFF'));
        if (oldState.selfDeaf !== newState.selfDeaf) changes.push('Self Deafen: ' + (newState.selfDeaf ? 'ON' : 'OFF'));
        if (oldState.serverMute !== newState.serverMute) changes.push('Server Mute: ' + (newState.serverMute ? 'ON' : 'OFF'));
        if (oldState.serverDeaf !== newState.serverDeaf) changes.push('Server Deafen: ' + (newState.serverDeaf ? 'ON' : 'OFF'));
        if (oldState.streaming !== newState.streaming) changes.push('Streaming: ' + (newState.streaming ? 'ON' : 'OFF'));
        if (oldState.selfVideo !== newState.selfVideo) changes.push('Camera: ' + (newState.selfVideo ? 'ON' : 'OFF'));
        if (changes.length === 0) return;
        description = member.user.tag + '\n' + changes.join('\n');
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(guild, embed);
}

// ========== BANS ==========
async function logBanAdd(guild, ban) {
    const embed = new EmbedBuilder()
        .setColor('#c0392b')
        .setTitle('Member Banned')
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: ban.user.tag, inline: true },
            { name: 'ID', value: ban.user.id, inline: true },
            { name: 'Reason', value: ban.reason || 'No reason provided', inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(guild, embed);
}

async function logBanRemove(guild, ban) {
    const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle('Member Unbanned')
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: ban.user.tag, inline: true },
            { name: 'ID', value: ban.user.id, inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(guild, embed);
}

// ========== SALONS ==========
async function logChannelCreate(channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Channel Created')
        .addFields(
            { name: 'Name', value: channel.name, inline: true },
            { name: 'ID', value: channel.id, inline: true },
            { name: 'Type', value: String(channel.type), inline: true },
            { name: 'Category', value: channel.parent ? channel.parent.name : 'None', inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(channel.guild, embed);
}

async function logChannelDelete(channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Channel Deleted')
        .addFields(
            { name: 'Name', value: channel.name, inline: true },
            { name: 'ID', value: channel.id, inline: true },
            { name: 'Type', value: String(channel.type), inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(channel.guild, embed);
}

async function logChannelUpdate(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push('Name: ' + oldChannel.name + ' → ' + newChannel.name);
    if (oldChannel.parentId !== newChannel.parentId) changes.push('Category changed');
    if (oldChannel.topic !== newChannel.topic) changes.push('Topic updated');
    if (oldChannel.nsfw !== newChannel.nsfw) changes.push('NSFW: ' + (newChannel.nsfw ? 'ON' : 'OFF'));
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push('Slowmode: ' + newChannel.rateLimitPerUser + 's');

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('Channel Updated')
        .addFields(
            { name: 'Channel', value: newChannel.toString() + ' (' + newChannel.name + ')', inline: true },
            { name: 'ID', value: newChannel.id, inline: true },
            { name: 'Changes', value: changes.join('\n').substring(0, 1000), inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(newChannel.guild, embed);
}

// ========== ROLES ==========
async function logRoleCreate(role) {
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Role Created')
        .addFields(
            { name: 'Name', value: role.name, inline: true },
            { name: 'ID', value: role.id, inline: true },
            { name: 'Color', value: role.hexColor, inline: true },
            { name: 'Position', value: String(role.position), inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(role.guild, embed);
}

async function logRoleDelete(role) {
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Role Deleted')
        .addFields(
            { name: 'Name', value: role.name, inline: true },
            { name: 'ID', value: role.id, inline: true },
            { name: 'Color', value: role.hexColor, inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(role.guild, embed);
}

async function logRoleUpdate(oldRole, newRole) {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push('Name: ' + oldRole.name + ' → ' + newRole.name);
    if (oldRole.color !== newRole.color) changes.push('Color: ' + oldRole.hexColor + ' → ' + newRole.hexColor);
    if (oldRole.hoist !== newRole.hoist) changes.push('Hoisted: ' + (newRole.hoist ? 'Yes' : 'No'));
    if (oldRole.mentionable !== newRole.mentionable) changes.push('Mentionable: ' + (newRole.mentionable ? 'Yes' : 'No'));
    if (!oldRole.permissions.equals(newRole.permissions)) {
        const added = newRole.permissions.toArray().filter(p => !oldRole.permissions.has(p));
        const removed = oldRole.permissions.toArray().filter(p => !newRole.permissions.has(p));
        if (added.length > 0) changes.push('Added: ' + added.join(', '));
        if (removed.length > 0) changes.push('Removed: ' + removed.join(', '));
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('Role Updated')
        .addFields(
            { name: 'Role', value: newRole.name, inline: true },
            { name: 'ID', value: newRole.id, inline: true },
            { name: 'Changes', value: changes.join('\n').substring(0, 1000), inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(newRole.guild, embed);
}

// ========== MEMBER UPDATE (roles, nick, avatar, timeout) ==========
async function logMemberUpdate(oldMember, newMember) {
    if (newMember.user.bot) return;
    const changes = [];

    if (oldMember.nickname !== newMember.nickname) {
        changes.push('Nickname: ' + (oldMember.nickname || 'None') + ' → ' + (newMember.nickname || 'None'));
    }

    if (oldMember.avatar !== newMember.avatar) {
        changes.push('Server avatar changed');
    }

    // Timeout
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    if (oldTimeout !== newTimeout) {
        if (newTimeout && newTimeout > Date.now()) {
            changes.push('Timeout applied until <t:' + Math.floor(newTimeout / 1000) + ':F>');
        } else {
            changes.push('Timeout removed');
        }
    }

    // Roles
    const oldRoles = oldMember.roles.cache.map(r => r.id).sort();
    const newRoles = newMember.roles.cache.map(r => r.id).sort();
    if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
        const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
        if (added.size > 0) changes.push('Roles added: ' + added.map(r => r.name).join(', '));
        if (removed.size > 0) changes.push('Roles removed: ' + removed.map(r => r.name).join(', '));
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('Member Updated')
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'User', value: newMember.user.tag, inline: true },
            { name: 'ID', value: newMember.id, inline: true },
            { name: 'Changes', value: changes.join('\n').substring(0, 1000), inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(newMember.guild, embed);
}

// ========== GUILD UPDATE ==========
async function logGuildUpdate(oldGuild, newGuild) {
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push('Name: ' + oldGuild.name + ' → ' + newGuild.name);
    if (oldGuild.icon !== newGuild.icon) changes.push('Icon changed');
    if (oldGuild.banner !== newGuild.banner) changes.push('Banner changed');
    if (oldGuild.description !== newGuild.description) changes.push('Description updated');
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) changes.push('AFK channel changed');
    if (oldGuild.systemChannelId !== newGuild.systemChannelId) changes.push('System channel changed');

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('Server Updated')
        .addFields(
            { name: 'Server', value: newGuild.name, inline: true },
            { name: 'Changes', value: changes.join('\n').substring(0, 1000), inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(newGuild, embed);
}

// ========== EMOJIS & STICKERS ==========
async function logEmojiCreate(emoji) {
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Emoji Created')
        .addFields(
            { name: 'Name', value: emoji.name, inline: true },
            { name: 'ID', value: emoji.id, inline: true },
            { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true }
        )
        .setThumbnail(emoji.imageURL())
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(emoji.guild, embed);
}

async function logEmojiDelete(emoji) {
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Emoji Deleted')
        .addFields(
            { name: 'Name', value: emoji.name, inline: true },
            { name: 'ID', value: emoji.id, inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(emoji.guild, embed);
}

async function logEmojiUpdate(oldEmoji, newEmoji) {
    if (oldEmoji.name === newEmoji.name) return;
    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('Emoji Updated')
        .addFields(
            { name: 'Before', value: oldEmoji.name, inline: true },
            { name: 'After', value: newEmoji.name, inline: true },
            { name: 'ID', value: newEmoji.id, inline: true }
        )
        .setThumbnail(newEmoji.imageURL())
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(newEmoji.guild, embed);
}

// ========== INVITATIONS ==========
async function logInviteCreate(invite) {
    if (!invite.guild) return;
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Invite Created')
        .addFields(
            { name: 'Code', value: invite.code, inline: true },
            { name: 'Channel', value: invite.channel ? invite.channel.toString() : 'Unknown', inline: true },
            { name: 'Inviter', value: invite.inviter ? invite.inviter.tag : 'Unknown', inline: true },
            { name: 'Max Uses', value: invite.maxUses === 0 ? 'Unlimited' : String(invite.maxUses), inline: true },
            { name: 'Expires', value: invite.expiresTimestamp ? '<t:' + Math.floor(invite.expiresTimestamp / 1000) + ':R>' : 'Never', inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(invite.guild, embed);
}

async function logInviteDelete(invite) {
    if (!invite.guild) return;
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Invite Deleted')
        .addFields(
            { name: 'Code', value: invite.code, inline: true },
            { name: 'Channel', value: invite.channel ? invite.channel.toString() : 'Unknown', inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(invite.guild, embed);
}

// ========== THREADS ==========
async function logThreadCreate(thread) {
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('Thread Created')
        .addFields(
            { name: 'Name', value: thread.name, inline: true },
            { name: 'Channel', value: thread.parent ? thread.parent.toString() : 'Unknown', inline: true },
            { name: 'Owner', value: thread.ownerId ? '<@' + thread.ownerId + '>' : 'Unknown', inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(thread.guild, embed);
}

async function logThreadDelete(thread) {
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('Thread Deleted')
        .addFields(
            { name: 'Name', value: thread.name, inline: true },
            { name: 'Channel', value: thread.parentId ? '<#' + thread.parentId + '>' : 'Unknown', inline: true }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(thread.guild, embed);
}

// ========== MODERATION ACTIONS (pour modpanel) ==========
async function logModerationAction(guild, moderator, target, action, reason) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.darkRed)
        .setTitle('Moderation Action')
        .addFields(
            { name: 'Action', value: action.charAt(0).toUpperCase() + action.slice(1), inline: true },
            { name: 'Moderator', value: moderator.tag, inline: true },
            { name: 'Target', value: target.tag + '\n' + target.id, inline: true },
            { name: 'Reason', value: reason || 'No reason provided', inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(guild, embed);
}

async function logInfractionRevoked(guild, moderator, infraction, revokeReason) {
    const user = await guild.client.users.fetch(infraction.userId).catch(() => null);
    const userName = user ? user.tag : 'Unknown User';

    const embed = new EmbedBuilder()
        .setColor('#27ae60')
        .setTitle('Infraction Revoked')
        .addFields(
            { name: 'Infraction ID', value: infraction.id, inline: true },
            { name: 'User', value: userName + '\n' + infraction.userId, inline: true },
            { name: 'Revoked By', value: moderator.tag, inline: true },
            { name: 'Original Type', value: infraction.type.charAt(0).toUpperCase() + infraction.type.slice(1), inline: true },
            { name: 'Original Reason', value: infraction.reason.substring(0, 500), inline: false },
            { name: 'Revocation Reason', value: revokeReason, inline: false }
        )
        .setFooter({ text: 'Jaxdrax Studio Audit', iconURL: LOGO_URL })
        .setTimestamp();
    await sendLog(guild, embed);
}

module.exports = {
    logMemberJoin,
    logMemberLeave,
    logMessageDelete,
    logMessageUpdate,
    logMessageBulkDelete,
    logVoiceState,
    logBanAdd,
    logBanRemove,
    logChannelCreate,
    logChannelDelete,
    logChannelUpdate,
    logRoleCreate,
    logRoleDelete,
    logRoleUpdate,
    logMemberUpdate,
    logGuildUpdate,
    logEmojiCreate,
    logEmojiDelete,
    logEmojiUpdate,
    logInviteCreate,
    logInviteDelete,
    logThreadCreate,
    logThreadDelete,
    logModerationAction,
    logInfractionRevoked
};
