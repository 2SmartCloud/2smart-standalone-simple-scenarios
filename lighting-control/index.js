const lightingControl = require('./lightingControl');

const {
    SWITCH_TOPIC,
    MOTION_TOPIC,
    TRIGGER_MESSAGE,
    SHUTDOWN_TIME,
    LIGHTING_TOPIC
// eslint-disable-next-line no-undef
} = scenario.args;

lightingControl(
    SWITCH_TOPIC,
    MOTION_TOPIC,
    TRIGGER_MESSAGE,
    SHUTDOWN_TIME,
    LIGHTING_TOPIC
);
