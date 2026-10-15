const { createGameServer } = require('../tests/game-server.cjs');

const server = createGameServer({ htmlPath: require('path').resolve('_site/index.html') });
server.listen(8000, '127.0.0.1', () => console.log('http://127.0.0.1:8000'));
