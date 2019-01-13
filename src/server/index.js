// index.js
'use strict';
const fs = require('fs');
const Express = require('express');
const Helmet = require('helmet');

const port = process.env.PORT || '3000';
const server = new Express();
server.use(Helmet());

const html = fs.readFileSync(`${__dirname}/../../docs/html/index.html`, 'utf8');
const localHtml = html.replace(/<base[^>]*>/gi, '');

server.use(Express.static(`${__dirname}/../../docs`));
server.get('/', (_, response) => response.send(localHtml));
server.get('/*', (_, response) => response.send(localHtml));

server.listen(port, () => console.log(`Server is listening ${port} port.`));
