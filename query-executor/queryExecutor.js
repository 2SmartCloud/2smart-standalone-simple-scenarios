const MSECS_IN_SEC = 1000;
// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

/* eslint-disable no-undef,no-param-reassign */
function createThreshold() {
    const thresholdId = 'result';
    const thresholdTopic = scenario.getThresholdTopic(thresholdId);

    const thresholdAttributes = {
        name     : 'result',
        datatype : 'string',
        unit     : '#',
        settable : false
    };

    scenario.initThreshold(thresholdId, thresholdAttributes);

    return thresholdTopic;
}

async function executeQuery(query, thresholdTopic) {
    // eslint-disable-next-line no-unused-vars
    const [ { time, topic, alias, ...columns } ] = await scenario.influx.query(query);

    const result = Object.keys(columns)
        .filter(column => columns[column])
        .map(column => `${column}: ${columns[column]}`)
        .join(', ');

    scenario.set(thresholdTopic, result);

    log.info('Execute query, set', thresholdTopic, JSON.stringify(result));
}

// eslint-disable-next-line func-style
const isSelectQuery = query => /^select/i.test(query);

module.exports = async (query, interval) => {
    try {
        interval *= MSECS_IN_SEC;

        const scenario = global.scenario;
        await scenario.init();

        if (!isSelectQuery(query)) throw new Error('query must be "SELECT"');

        const limitRegex = /limit \d+/i;
        // add a limit to query
        query = limitRegex.test(query) ? query.replace(limitRegex, 'LIMIT 1') : `${query} LIMIT 1`;

        await scenario.init();

        const thresholdTopic = createThreshold();

        await executeQuery(query, thresholdTopic);

        setInterval(() => executeQuery(query, thresholdTopic), interval);
    } catch (e) {
        log.warn(e.message);
    }
};
