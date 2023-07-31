/* eslint-disable no-undef */
const getForecast = require('./lib/zambretti');

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

const Trend = {
    Steady  : 0,
    Rising  : 1,
    Falling : 2
};

function createAndInitForecastThreshold() {
    const thresholdId = 'forecast';

    const thresholdAttributes = {
        name     : thresholdId,
        datatype : 'string',
        unit     : '#',
        settable : false
    };

    scenario.initThreshold(thresholdId, thresholdAttributes); // initialize threshold

    return scenario.getThresholdTopic(thresholdId); // get threshold topic by threshold ID
}

async function predict(pressureTopic, windDirectionTopic, thresholdTopic) {
    const [ currentPressureInstance ] = await scenario.influx.query(`
        SELECT * 
        FROM "timelines" 
        WHERE ("topic"='${pressureTopic}')
        ORDER BY time DESC
        LIMIT 2
    `);

    if (!currentPressureInstance) {
        throw new Error('There is no data about current pressure in database, please start appropriate bridge');
    }

    // eslint-disable-next-line no-magic-numbers
    const timeThreeHoursAgo = currentPressureInstance.time.getNanoTime() - (1000 * 60 * 60 * 3 * 1000000);

    const [ previousPressureInstance ] = await scenario.influx.query(`
        SELECT * 
        FROM "timelines" 
        WHERE ("topic"='${pressureTopic}' AND "time" <= ${timeThreeHoursAgo})
        ORDER BY time DESC
        LIMIT 1
    `);

    const [ lastWindDirectionInstance ] = await scenario.influx.query(`
        SELECT * 
        FROM "timelines" 
        WHERE ("topic"='${windDirectionTopic}')
        ORDER BY time DESC
        LIMIT 1
    `);

    if (!lastWindDirectionInstance) {
        throw new Error('There is no date about current wind direction, please start appropriate bridge');
    }

    const currentPressure = currentPressureInstance ? currentPressureInstance.number : 0;
    const previousPressure = previousPressureInstance ? previousPressureInstance.number : currentPressure;

    // eslint-disable-next-line no-nested-ternary
    const trend = currentPressure > previousPressure ?
        Trend.Rising :
        currentPressure < previousPressure ?
            Trend.Falling :
            Trend.Steady;

    const forecast = getForecast(
        currentPressure,
        trend,
        new Date().getMonth() + 1,
        lastWindDirectionInstance.number
    );

    scenario.set(thresholdTopic, forecast);

    log.info({
        date                 : new Date().toString(),
        currentWindDirection : lastWindDirectionInstance.number,
        thresholdTopic,
        forecast,
        currentPressure
    });
}

module.exports = async (pressureTopic, windDirectionTopic) => {
    try {
        if (!pressureTopic) throw new Error('pressureTopic is required!');
        if (!windDirectionTopic) throw new Error('windDirectionTopic is required!');

        await scenario.init();

        const thresholdTopic = createAndInitForecastThreshold();
        await predict(pressureTopic, windDirectionTopic, thresholdTopic);

        // eslint-disable-next-line no-magic-numbers
        const interval = 1000 * 60 * 30; // 30m
        setInterval(() => predict(pressureTopic, windDirectionTopic, thresholdTopic), interval);
    } catch (e) {
        log.warn(e.message);
    }
};
