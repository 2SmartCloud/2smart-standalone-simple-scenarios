const startDaylightControl = require('./lib/daylight-control');

const {
    CITY_COORDINATES,
    SWITCHER_TOPICS,
    MESSAGE_ON,
    MESSAGE_OFF,
    OFFSET
} = global.scenario.args;

startDaylightControl(
    CITY_COORDINATES,
    SWITCHER_TOPICS,
    MESSAGE_ON,
    MESSAGE_OFF,
    OFFSET
);
