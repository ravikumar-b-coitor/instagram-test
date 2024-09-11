const express = require('express');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const FormData = require('form-data');
const axios = require("axios");
const cors = require('cors');
const qs = require('qs');
const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// const API_URL = "https://api-digitalwall.coitor.com/"
const API_URL = "https://api-digitalwall.xploro.io/"

const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: [
			"http://localhost:5173", // Your client's origin
			"https://admin-digitalwall.coitor.com", // Additional origin
			"https://admin-digitalwall.xploro.io",
			"https://admin-digitalwall-demo.xploro.io"
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

app.post('/insta', async (req, res) => {
	try {
		console.log("POST   ---   Instagram => ", 'Params:', req.params, 'Query:', req.query);
		console.log('Body:', JSON.stringify(req.body));
		// Handle webhook events here
		const data = req.body;

		io.emit('instaEvent', { method: 'GET', params: req.params, query: req.query, body: req.body });
		if (data?.object === "instagram" &&
			data?.entry?.length > 0 &&
			data.entry[0]?.changes?.length > 0 &&
			data.entry[0].changes[0]?.field === "comments" && data.entry[0].changes[0].value?.parent_id === undefined) {

			const postId = data.entry[0].changes[0].value?.media?.id;
			const messageText = data.entry[0].changes[0].value?.text;
			const commentId = data.entry[0]?.changes[0].value?.id;
			const RecipientID = data.entry[0]?.changes[0].value?.from.id;
			const RecipientName = data.entry[0]?.changes[0].value?.from.username
			const time = data.entry[0]?.time

			if (postId && messageText && commentId) {
				try {
					const response = await axios.post(
						`${API_URL}Instagram/ReplyCommentAutomationV2`,
						qs.stringify({
							PostId: postId.toString(),
							Message: messageText,
							RecipientID: RecipientID,
							RecipientName: RecipientName,
							CommentTime: Number(time),
						}),
						{
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								'accept': 'application/json'
							},
							params: {
								CommentID: commentId
							}
						}
					);

					console.log("Response:", response.data);
					console.log("New comment received.....");

				} catch (error) {
					console.error("Error sending reply:", error);
				}
			} else {
				console.error("Missing required fields.");
			}

		} else {
			console.error("Data structure does not match expected format.");
		}

		if (data?.object === "instagram" && data?.entry?.[0]?.messaging?.length > 0) {
			console.log("Ok");

			const senderId = data.entry[0].messaging[0]?.sender?.id;
			const recipientId = data.entry[0].messaging[0]?.recipient?.id;
			const text = data.entry[0].messaging[0]?.message?.text;

			console.log("Sender ID:", senderId);
			console.log("Recipient ID:", recipientId);
			console.log("Text:", text);

			if (senderId && recipientId && text) {
				try {
					const formData = new FormData();
					formData.append('SenderId', senderId);
					formData.append('DmMessage', text);
					formData.append('RecipientId', recipientId);

					const response = await axios.post(
						`${API_URL}Instagram/ReplyDirectDM`,
						formData,
						{
							headers: {
								...formData.getHeaders(), // Use form-data's headers
								'accept': 'application/json'
							}
						}
					);

					console.log("Response:", response.data);
				} catch (error) {
					console.error("Error sending direct message:", error);
				}
			} else {
				console.error("Missing required fields: SenderId, RecipientID, or text.");
			}
		} else {
			console.error("Data structure does not match expected format or messaging is missing.");
		}

		res.status(200).send('Event received');
	} catch (error) {
		console.error("ErRrOr", error);
	}
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