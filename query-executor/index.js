const queryExecutor = require('./queryExecutor');

const {
    QUERY,
    INTERVAL
} = scenario.args;

queryExecutor(
    QUERY,
    INTERVAL
);
