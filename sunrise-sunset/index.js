const sunriseSunset = require('./lib/sunrise-sunset');

const {
    CITY,
    SUNRISE_TOPIC,
    SUNRISE_MESSAGE,
    SUNRISE_OFFSET,
    SUNSET_TOPIC,
    SUNSET_MESSAGE,
    SUNSET_OFFSET,
    ACTIVATION_SENSORS
} = scenario.args;

sunriseSunset(
    CITY,
    SUNRISE_TOPIC,
    SUNRISE_MESSAGE,
    SUNRISE_OFFSET,
    SUNSET_TOPIC,
    SUNSET_MESSAGE,
    SUNSET_OFFSET,
    ACTIVATION_SENSORS
);
