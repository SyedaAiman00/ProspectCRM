/**
 * Pure utility for aggregating Client financial data.
 * Kept separate from pipeline.js since Clients don't move through
 * pipeline stages — they're already-converted policies tracked by financials.
 * Reusable by both the Clients Pipeline page and the future Commission Ledger.
 */


/**
 * Mean of comm_rate across only the clients that actually have one set —
 * clients with no rate entered are excluded from the average entirely
 * (not treated as 0%), so a few unset records don't drag it down artificially.
 * @param {object[]} clients
 * @returns {number}
 */
export function calculateAverageCommRate(clients) {
    const ratedClients = clients.filter((c) => c.commRate !== null && c.commRate !== undefined);
    if (ratedClients.length === 0) return 0;

    const sum = ratedClients.reduce((total, c) => total + Number(c.commRate), 0);
    return sum / ratedClients.length;
}

/**
 * Sum of premium actually collected across all clients.
 * @param {object[]} clients
 * @returns {number}
 */
export function calculateTotalCollectedPremium(clients) {
    return clients.reduce((total, c) => total + (Number(c.collectedPremium) || 0), 0);
}

/**
 * Sum of outstanding balance across all clients.
 * @param {object[]} clients
 * @returns {number}
 */
export function calculateOutstandingBalance(clients) {
    return clients.reduce((total, c) => total + (Number(c.balance) || 0), 0);
}

/**
 * Sum of agent commission earned across all clients.
 * @param {object[]} clients
 * @returns {number}
 */
export function calculateTotalAgentCommission(clients) {
    return clients.reduce((total, c) => total + (Number(c.agentCommission) || 0), 0);
}

/**
 * Whether a client still owes money (balance > 0).
 * @param {object} client
 * @returns {boolean}
 */
export function hasOutstandingBalance(client) {
    return (Number(client.balance) || 0) > 0;
}