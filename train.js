const brain = require('brain.js');
const fs = require('fs');

const net = new brain.recurrent.LSTM();

let trainData = fs.readFileSync('trainMessages.json', 'utf8');
let messages = [];

trainData = JSON.parse(trainData);

for (let i = 0; i < trainData.length; i++) {
    messages.push(`USER: ${trainData[i].message}\nAI: ${trainData[i].response}\n`);
};

net.train(messages, {
    iterations: 1000,
    errorThresh: 0.011,
    log: true,
    logPeriod: 10,
});

fs.writeFileSync('elysium.json', JSON.stringify(net.toJSON()));