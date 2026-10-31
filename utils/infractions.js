const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const INFRACTIONS_FILE = path.join(DATA_DIR, 'infractions.json');

function loadInfractions() {
    try {
        if (!fs.existsSync(INFRACTIONS_FILE)) return [];
        const parsed = JSON.parse(fs.readFileSync(INFRACTIONS_FILE, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('[Infractions] Load failed:', error.message);
        return [];
    }
}

function saveInfractions(infractions) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(INFRACTIONS_FILE, JSON.stringify(infractions, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('[Infractions] Save failed:', error.message);
        return false;
    }
}

function generateInfractionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INF-${timestamp}-${random}`;
}

async function addInfraction(userId, moderatorId, type, reason) {
    const infractions = loadInfractions();
    
    const infraction = {
        id: generateInfractionId(),
        userId: userId,
        moderatorId: moderatorId,
        type: type,
        reason: reason,
        createdAt: new Date().toISOString(),
        revoked: false,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null
    };
    
    infractions.push(infraction);
    saveInfractions(infractions);
    
    return infraction;
}

function getUserInfractions(userId) {
    const infractions = loadInfractions();
    return infractions.filter(inf => inf.userId === userId);
}

function getInfractionById(infractionId) {
    const infractions = loadInfractions();
    return infractions.find(inf => inf.id === infractionId) || null;
}

async function revokeInfraction(infractionId, revokedById, revokeReason) {
    const infractions = loadInfractions();
    const infraction = infractions.find(inf => inf.id === infractionId);
    
    if (!infraction) {
        return { success: false, error: 'Infraction not found' };
    }
    
    if (infraction.revoked) {
        return { success: false, error: 'Infraction already revoked' };
    }
    
    infraction.revoked = true;
    infraction.revokedAt = new Date().toISOString();
    infraction.revokedBy = revokedById;
    infraction.revokeReason = revokeReason;
    
    saveInfractions(infractions);
    
    return { success: true, infraction: infraction };
}

function getInfractionCount(userId) {
    const infractions = getUserInfractions(userId);
    return {
        total: infractions.length,
        active: infractions.filter(inf => !inf.revoked).length,
        revoked: infractions.filter(inf => inf.revoked).length
    };
}

module.exports = {
    addInfraction,
    getUserInfractions,
    getInfractionById,
    revokeInfraction,
    getInfractionCount,
    loadInfractions
};
