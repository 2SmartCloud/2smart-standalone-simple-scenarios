const notifier = require('./notifier');

const {
    TOPICS,
    OPERATOR,
    VALUE_FOR_COMPARISON,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_MESSAGE
} = scenario.args;

notifier(
    TOPICS,
    OPERATOR,
    VALUE_FOR_COMPARISON,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_MESSAGE
);
