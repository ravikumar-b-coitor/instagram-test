const express = require('express');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: [
			"http://localhost:5173", // Your client's origin
			"https://admin-digitalwall.coitor.com" // Additional origin
		],
		methods: ["GET", "POST"]
	}
});

app.get('/', (req, res) => {
	// Combine both messages into one response
	res.send("Hello world!")
});


io.on('connection', (socket) => {
	console.log('a user connected');

	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});

app.get('/insta', (req, res) => {
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


	io.emit('instaEvent', { method: 'GET', params: req.params, query: req.query, body: req.body });
	res.status(200).send('Event received');
});

app.post('/insta/feed', (req, res) => {
	console.log("POST   ---   /insta/feed => ", 'Params:', req.params, 'Query:', req.query);
	console.log('Body:', JSON.stringify(req.body));
	// Handle webhook events here


	io.emit('instaEvent', { method: 'GET', params: req.params, query: req.query, body: req.body });
	res.status(200).send('Event received');
});

app.post('/insta/messages', (req, res) => {
	console.log("POST   ---   /insta/messages => ", 'Params:', req.params, 'Query:', req.query);
	console.log('Body:', JSON.stringify(req.body));
	// Handle webhook events here


	io.emit('instaEvent', { method: 'GET', params: req.params, query: req.query, body: req.body });
	res.status(200).send('Event received');
});

app.get('/user', (req, res) => {
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

server.listen(port, '0.0.0.0', () => {
	console.log(`Server running at http://0.0.0.0:${port}`);
});