const { CronJob } = require('cron');

// const { log } = scenario;
// ! remove this when new version of scenario-runner with scenario.log will be merged and uncomment line above
const log = {
    info : console.log,
    warn : console.warn
};

module.exports = async (cronExpression, switchTopic, message) => {
    try {
        if (!cronExpression) throw new Error('cronExprerssion is required');
        if (!switchTopic) throw new Error('switchTopic is required');
        if (!message) throw new Error('message is required');

        const scenario = global.scenario;

        await scenario.init();
        const switchList = Array.isArray(switchTopic) ? switchTopic : [ switchTopic ];

        const timeZone = process.env.TZ || 'Etc/Greenwich';
        const task = new CronJob(cronExpression, () => {
            switchList.forEach(topic => {
                scenario.set(`${topic}`, message);

                log.info('On cron job, set', topic, message);
            });
        }, null, true, timeZone);

        task.start();
    } catch (e) {
        log.warn(e.message);
    }
};
