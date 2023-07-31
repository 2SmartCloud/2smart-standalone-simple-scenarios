const wateringSchedule = require('./lib/schedule');

const {
    SCHEDULE_CONFIG,
    OUTPUT_TOPIC,
    START_TIME_VALUE,
    END_TIME_VALUE,
    WEATHER_TOPIC,
    WEATHER_CONDITION,
    TIME_DELAY,
    HUMIDITY_TOPIC
} = scenario.args;

wateringSchedule(
    SCHEDULE_CONFIG,
    OUTPUT_TOPIC,
    START_TIME_VALUE,
    END_TIME_VALUE,
    WEATHER_TOPIC,
    WEATHER_CONDITION,
    TIME_DELAY,
    HUMIDITY_TOPIC
);
