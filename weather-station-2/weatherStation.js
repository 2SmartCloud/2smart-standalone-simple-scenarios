const getForecast           = require('./lib/betel_cast');
const { TREND, HEMISPHERE } = require('./lib/constants');

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

const AVG_COMPASS_POINTS_AZIMUTHS = {
    0     : 'N',
    22.5  : 'NNE',
    45    : 'NE',
    67.5  : 'ENE',
    90    : 'E',
    112.5 : 'ESE',
    135   : 'SE',
    157.5 : 'SSE',
    180   : 'S',
    202.5 : 'SSW',
    225   : 'SW',
    247.5 : 'WSW',
    270   : 'W',
    292.5 : 'WNW',
    315   : 'NW',
    337.5 : 'NNW'
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

    if (!currentPressureInstance) {
        throw new Error("There is no data about current pressure in database, please start appropriate bridge");
    }

    const currentPressure = currentPressureInstance ? currentPressureInstance.number : 0;
    const previousPressure = previousPressureInstance ? previousPressureInstance.number : currentPressure;
    const currentWindDirection = lastWindDirectionInstance ?
        Object.keys(AVG_COMPASS_POINTS_AZIMUTHS).reduce((direction, avgAzimuths) => {
            const currDiff = Math.abs(+avgAzimuths - +lastWindDirectionInstance.string);

            if (currDiff < direction.minDiff) {
                direction.value = AVG_COMPASS_POINTS_AZIMUTHS[avgAzimuths];
                direction.minDiff = currDiff;
            }

            return direction;
        }, { value: 'N', minDiff: +lastWindDirectionInstance.string }).value :
        1; // if there is no wind direction than set 'nonsense' value as "1" as described in betel_cast.js file

    const trend = currentPressure > previousPressure ?
        TREND.RISING :
        currentPressure < previousPressure ?
            TREND.FALLING :
            TREND.STEADY;

    const [ forecast ] = getForecast(
        currentPressure,
        new Date().getMonth() + 1,
        currentWindDirection,
        trend,
        HEMISPHERE.NORTH,
        1050,
        950
    );

    scenario.set(thresholdTopic, forecast);

    log.info({
        date : new Date().toString(),
        forecast,
        currentPressure,
        currentWindDirection
    });
}

module.exports = async (pressureTopic, windDirectionTopic) => {
    try {
        if (!pressureTopic) throw new Error('pressureTopic is required!');
        if (!windDirectionTopic) throw new Error('windDirectionTopic is required!');

        await scenario.init();

        const thresholdTopic = createAndInitForecastThreshold();
        await predict(pressureTopic, windDirectionTopic, thresholdTopic);

        const interval = 1000 * 60 * 30; // 30m
        setInterval(() => predict(pressureTopic, windDirectionTopic, thresholdTopic), interval);
    } catch (e) {
        log.warn(e.message);
    }
};
