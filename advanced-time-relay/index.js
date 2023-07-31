const advancedTimeRelay = require('./lib/schedule');

const {
    SCHEDULE_CONFIG,
    OUTPUT_TOPIC,
    MESSAGE_ON_VALUE,
    MESSAGE_OFF_VALUE
} = scenario.args;

advancedTimeRelay(
    SCHEDULE_CONFIG,
    OUTPUT_TOPIC,
    MESSAGE_ON_VALUE,
    MESSAGE_OFF_VALUE,
);
