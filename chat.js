const brain = require('brain.js');

const net = new brain.recurrent.LSTM();

net.fromJSON(require('./elysium.json'));

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.setPrompt('You: ');
rl.prompt();

rl.on('line', (input) => {
    console.log(`AI: ${net.run(input)}`);
    rl.prompt();
});

rl.on('close', () => {
    process.exit(0);
});