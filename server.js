const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors()); // Enable CORS for all origins
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.get('/insta', (req, res) => {
	console.log(`
		
		`);
	console.log("GET   ---   Instagram => ", 'Params:', req.params, 'Query:', req.query);
	console.log('Body:', JSON.stringify(req.body));

	const challenge = req.query['hub.challenge'];

	if (challenge) {
		res.send(challenge);
	}
});

app.post('/insta', (req, res) => {
	console.log("POST   ---   Instagram => ", 'Params:', req.params, 'Query:', req.query);
	console.log('Body:', JSON.stringify(req.body));
	// Handle webhook events here

	res.status(200).send('Event received');
});

app.get('/user', (req, res) => {
	console.log(`
		
	`);
	console.log("GET   ---   User => ", 'Params:', req.params, 'Query:', req.query);
	console.log('Body:', JSON.stringify(req.body));

	const challenge = req.query['hub.challenge'];

	if (challenge) {
		res.send(challenge);
	}
});

app.post('/user', (req, res) => {
	console.log("POST   -----   User => ", 'Params:', req.params, 'Query:', req.query);
	console.log('Body:', JSON.stringify(req.body));
	// Handle webhook events here

	res.status(200).send('Event received');
});

app.listen(port, '0.0.0.0', () => {
	console.log(`Server running at http://0.0.0.0:${port}`);
});