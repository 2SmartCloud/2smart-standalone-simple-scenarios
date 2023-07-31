const fakePresence = require('./fake-presence');

const {
    TOPICS,
    ON_MESSAGE,
    OFF_MESSAGE,
    ON_MIN_DURATION,
    ON_MAX_DURATION,
    OFF_MIN_DURATION,
    OFF_MAX_DURATION
// eslint-disable-next-line no-undef
} = scenario.args;

fakePresence(
    TOPICS,
    ON_MESSAGE,
    OFF_MESSAGE,
    ON_MIN_DURATION,
    ON_MAX_DURATION,
    OFF_MIN_DURATION,
    OFF_MAX_DURATION
);
