/**
 * A simple HTTP server that returns a textual response that contains the body
 * content of the original request in it. The server will also force a random
 * delay on the response time, meaning HAProxy will think that some of the
 * responses have timed out.
 *
 * Requirements: node.js.
 * Dependencies: none.
 * Running: node ./mirror-server.js
 */

'use strict';

const SERVER_PORT = 3333;
// A random value in this range will be rolled for each incoming request, and
// the response will be delayed by this amount of time. The purpose of this is
// to test how HAProxy behaves if a response is late.
const RESPONSE_DELAY_MS = [10, 125]; // Random min-max

const http = require('http');

main();

function main() {
	const server = new http.Server();

	server.on('request', (req, res) => {
		const chunk_list = [];

		req.on('data', chunk => {
			chunk_list.push(chunk);
		});

		req.on('end', async () => {
			const artificial_response_delay = random_range(RESPONSE_DELAY_MS);

			let body_message;
			if (chunk_list.length === 0) {
				body_message = 'Empty request body.'
			} else {
				const body = Buffer.concat(chunk_list);
				body_message = 'Request body: [' + String(body) + ']';
			}

			console.log(`Got a request on '${req.url}'. Response will be delayed by ${artificial_response_delay}ms. ${body_message}`);

			await delay(artificial_response_delay);
			res.statusCode = 200;
			res.end(`Welcome: ${req.url}. ${body_message}\n`);
		});
	});

	server.listen(SERVER_PORT, () => {
		console.log(`Test server up and running on port ${server.address().port}.`);
	});
}

function delay(milliseconds) {
	return new Promise(resolve => {
		setTimeout(resolve, milliseconds);
	});
}

function random_range([min, max]) {
	const delta = max - min;
	return min + Math.floor(Math.random() * delta)
}
