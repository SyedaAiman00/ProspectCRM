/**
 * Pure utility for determining which Kanban pipeline stage a prospect belongs to.
 * Extracted from dashboard.js so both the Prospects Board and any future
 * reporting/dashboard views can reuse the same classification logic.
 */

export const PIPELINE_STAGES = {
    NEW: 'new',
    CONTACTED: 'contacted',
    PROGRESS: 'progress',
    QUALIFIED: 'qualified',
};

/**
 * Determine the pipeline stage for a single prospect.
 * @param {object} prospect - a prospect record (as returned by /api/prospects)
 * @returns {string} one of PIPELINE_STAGES values
 */
export function getPipelineStage(prospect) {
    const response = (prospect.callResponse || '').toLowerCase();

    if (prospect.closingDate || response.includes('closed') || response.includes('issued')) {
        return PIPELINE_STAGES.QUALIFIED;
    }

    if (prospect.firstAppointmentDate || response.includes('meeting scheduled')) {
        return PIPELINE_STAGES.PROGRESS;
    }

    if (response.includes('interested') || response.includes('call back') || prospect.callResponse) {
        return PIPELINE_STAGES.CONTACTED;
    }

    return PIPELINE_STAGES.NEW;
}

/**
 * Bucket a full list of prospects into their pipeline stages.
 * @param {object[]} prospects
 * @returns {{new: object[], contacted: object[], progress: object[], qualified: object[]}}
 */
export function groupProspectsByStage(prospects) {
    const groups = {
        [PIPELINE_STAGES.NEW]: [],
        [PIPELINE_STAGES.CONTACTED]: [],
        [PIPELINE_STAGES.PROGRESS]: [],
        [PIPELINE_STAGES.QUALIFIED]: [],
    };

    prospects.forEach((p) => {
        const stage = getPipelineStage(p);
        groups[stage].push(p);
    });

    return groups;
}

/**
 * Sum the income across a list of prospects (used for pipeline value KPI).
 * @param {object[]} prospects
 * @returns {number}
 */
export function calculatePipelineValue(prospects) {
    return prospects.reduce((total, p) => {
        const income = p.income ? parseInt(p.income, 10) : 0;
        return total + income;
    }, 0);
}