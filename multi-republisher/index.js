const multiRepublisher = require('./multiRepublisher');

const {
    TOPICS
} = scenario.args;

multiRepublisher(TOPICS);
