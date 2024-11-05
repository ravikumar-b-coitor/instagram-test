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

const data = require('./app.json');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// const API_URL = "https://api-digitalwall.coitor.com/"
const API_URL = "https://api-digitalwall.xploro.io/";

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

app.use(express.static('public'));

app.get('/', (req, res) => {
	res.send("Hello")
	// res.sendFile(__dirname + '/public/index.html');
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

		if (
			data &&
			data.entry &&
			Array.isArray(data.entry) &&
			data.entry.length > 0 &&
			data.entry[0].changes &&
			Array.isArray(data.entry[0].changes) &&
			data.entry[0].changes.length > 0 &&
			data.entry[0].changes[0].value
		) {
			const commentEntry = data.entry[0].changes[0].value;

			const API_URLS = [
				"https://api-digitalwall.coitor.com/Instagram/ReplyCommentAutomationV3",
				"https://api-digitalwall.xploro.io/Instagram/ReplyCommentAutomationV3",
				"https://api-digitalwall-demo.xploro.io/Instagram/ReplyCommentAutomationV3"
			];

			// Construct the payload for the API requests
			const payload = {
				CommentID: String(commentEntry.comment_id) || "",
				Message: String(commentEntry.message) || "",
				PostId: String(commentEntry.post_id) || "",
				RecipientID: String(commentEntry.from.id) || "",
				RecipientName: String(commentEntry.from.name) || "",
				CommentTime: commentEntry.created_time || 0
			};

			try {
				// Send the payload to each API URL and wait for all promises to settle
				const results = await Promise.allSettled(
					API_URLS.map(url =>
						axios.post(url, payload, { // No need to stringify here, axios handles JSON automatically
							headers: {
								'Content-Type': 'application/json',
								'accept': 'application/json'
							},
						})
					)
				);

				// Handle results from all endpoints
				results.forEach((result, index) => {
					if (result.status === 'fulfilled') {
						console.log(`Success response from ${API_URLS[index]}:`, result.value.data);
					} else {
						console.error(`Error response from ${API_URLS[index]}:`, result.reason.message);
					}
				});

				console.log("New comment received and processed.");
			} catch (error) {
				console.error("Error while sending requests to APIs:", error.message);
			}
		} else {
			console.error("Invalid input format received:", JSON.stringify(data));
			return res.status(400).send('Invalid input format');
		}

		return res.status(200).send('Event received');

		//------------

		io.emit('instaEvent', { method: 'GET', params: req.params, query: req.query, body: req.body });
		if (data?.object === "instagram" &&
			data?.entry?.length > 0 &&
			data.entry[0]?.changes?.length > 0 &&
			data.entry[0].changes[0]?.field === "comments" && data.entry[0].changes[0].value?.parent_id === undefined) {
			console.log("||||||||||||||||||||||||||||||||||     ReplyCommentAutomationV3    |||||||||||||||||||||||||||");

			const postId = data.entry[0].changes[0].value?.media?.id;
			const messageText = data.entry[0].changes[0].value?.text;
			const commentId = data.entry[0]?.changes[0].value?.id;
			const RecipientID = data.entry[0]?.changes[0].value?.from.id;
			const RecipientName = data.entry[0]?.changes[0].value?.from.username;
			const time = data.entry[0]?.time;

			if (postId && messageText && commentId) {
				const API_URLS = [
					"https://api-digitalwall.coitor.com/Instagram/ReplyCommentAutomationV3",
					"https://api-digitalwall.xploro.io/Instagram/ReplyCommentAutomationV3",
					"https://api-digitalwall-demo.xploro.io/Instagram/ReplyCommentAutomationV3"
				];

				const payload = {
					PostId: postId.toString(),
					Message: messageText,
					RecipientID: RecipientID,
					RecipientName: RecipientName,
					CommentTime: Number(time),
					CommentID: commentId,
				};

				try {
					const results = await Promise.allSettled(
						API_URLS.map(url =>
							axios.post(url, JSON.stringify(payload), {
								headers: {
									'Content-Type': 'application/json',
									'accept': 'application/json'
								},
							})
						)
					);

					// Handle results from all endpoints
					results.forEach((result, index) => {
						if (result.status === 'fulfilled') {
							console.log(`Success response from ${API_URLS[index]}:`, result.value.data);
						} else {
							console.error(`Error response from ${API_URLS[index]}:`, result.reason.message);
						}
					});

					console.log("New comment received and processed.");

				} catch (error) {
					console.error("Unexpected error:", error);
				}
			} else {
				console.error("Missing required fields.");
			}

		} else {
			console.error("Data structure does not match expected format.");
		}

		if (
			data?.object === "instagram" &&
			data?.entry?.length > 0 &&
			data.entry[0]?.messaging?.length > 0 &&
			data.entry[0].messaging[0]?.read
		) {
			console.log("||||||||||||||||||||||||||||||||||     InstaDmReadState    |||||||||||||||||||||||||||");

			const API_URLS = [
				"https://api-digitalwall.coitor.com/Instagram/InstaDmReadState",
				"https://api-digitalwall.xploro.io/Instagram/InstaDmReadState",
				"https://api-digitalwall-demo.xploro.io/Instagram/InstaDmReadState"
			];

			const payload = {
				MessageId: data.entry[0].messaging[0].read.mid,
				SenderId: data.entry[0].messaging[0].sender.id,
				ReceiverId: data.entry[0].messaging[0].recipient.id,
			};

			try {
				const results = await Promise.allSettled(
					API_URLS.map(url =>
						axios.post(url, JSON.stringify(payload), {
							headers: {
								'Content-Type': 'application/json',
								'accept': 'application/json'
							},
						})
					)
				);

				// Handle results from all endpoints
				results.forEach((result, index) => {
					if (result.status === 'fulfilled') {
						console.log(`Success response from ${API_URLS[index]}:`, result.value.data);
					} else {
						console.error(`Error response from ${API_URLS[index]}:`, result.reason.message);
					}
				});

				console.log("New comment readed and processed...");
			} catch (error) {
				console.error("Unexpected error:", error);
			}
		} else {
			console.log("Conditions not met or 'read' key is missing.");
		}

		if (
			data?.object === "instagram" &&
			data?.entry?.length > 0 &&
			data.entry[0]?.messaging?.length > 0 &&
			data.entry[0].messaging[0]?.message
		) {
			console.log("||||||||||||||||||||||||||||||||||     AddInstaDm    |||||||||||||||||||||||||||");

			const senderId = data.entry[0].messaging[0].sender.id;
			const receiverId = data.entry[0].messaging[0].recipient.id;
			const messageId = data.entry[0].messaging[0].message.mid;
			const message = data.entry[0].messaging[0].message.text;

			const API_URLS = [
				"https://api-digitalwall.coitor.com/Instagram/AddInstaDm/",
				"https://api-digitalwall.xploro.io/Instagram/AddInstaDm/",
				"https://api-digitalwall-demo.xploro.io/Instagram/AddInstaDm/"
			];

			Promise.allSettled(
				API_URLS.map(url => {
					console.log(`Making request to: ${url}`);
					return axios.get(url, {
						params: {
							SenderId: senderId,
							ReceiverId: receiverId,
							MessageId: messageId,
							Message: message
						}
					});
				})
			)
				.then(results => {
					results.forEach((result, index) => {
						if (result.status === "fulfilled") {
							console.log(`Response from API  AddInstaDm----- ${index + 1}:`, result.value.data);
						} else {
							console.error(`Error from API  AddInstaDm----- ${index + 1}:`, result.reason);
						}
					});
				});
		} else {
			console.log("Conditions not met or 'message' key is missing. AddInstaDm-----");
		}

		if (data?.object === "instagram" && data?.entry?.[0]?.messaging?.length > 0) {
			console.log("||||||||||||||||||||||||||||||||||     ReplyDirectDM    |||||||||||||||||||||||||||");

			const senderId = data.entry[0].messaging[0]?.sender?.id;
			const recipientId = data.entry[0].messaging[0]?.recipient?.id;
			const text = data.entry[0].messaging[0]?.message?.text;

			if (senderId && recipientId && text) {
				const API_URLS = [
					"https://api-digitalwall.coitor.com/Instagram/ReplyDirectDM",
					"https://api-digitalwall.xploro.io/Instagram/ReplyDirectDM",
					"https://api-digitalwall-demo.xploro.io/Instagram/ReplyDirectDM"
				];

				const formData = new FormData();
				formData.append('SenderId', senderId);
				formData.append('DmMessage', text);
				formData.append('RecipientId', recipientId);

				try {
					// Prepare form data for each endpoint
					const results = await Promise.allSettled(
						API_URLS.map(url =>
							axios.post(url, formData, {
								headers: {
									...formData.getHeaders(), // Use form-data's headers
									'accept': 'application/json'
								}
							})
						)
					);

					// Handle results from all endpoints
					results.forEach((result, index) => {
						if (result.status === 'fulfilled') {
							console.log(`Success response from ${API_URLS[index]}:`, result.value.data);
						} else {
							console.error(`Error response from ${API_URLS[index]}:`, result.reason.message);
						}
					});

				} catch (error) {
					console.error("Unexpected error:", error);
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
	console.log(`Server running at http://localhost:${port}`);
});