const express = require('express');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const FormData = require('form-data');
const axios = require("axios");
const https = require('https');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;
const audioProcessor = require("./audio");

let config = { verifyToken: "123456789" }

app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));

const logFilePath = path.join(__dirname, 'insta-logs.txt');			// Define the log file path
const writeLogToFile = (logMessage) => {
	const timestamp = new Date().toLocaleString("en-IN", {
		timeZone: "Asia/Kolkata",
		hour12: false,
	});
	const formattedLog = `[${timestamp}] ${logMessage}\n`;

	fs.appendFile(logFilePath, formattedLog, (err) => {
		if (err) {
			console.error('Failed to write log:', err);
		}
	});
};

const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: [
			"http://localhost:5173", // Your client's origin
			"https://admin-digitalwall.coitor.com", // Additional origin
			"https://admin-digitalwall.xploro.io",
			"https://admin-digitalwall-demo.xploro.io",
			"https://sangeetha-dev.xploro.io"
		],
		methods: ["GET", "POST"]
	}
});

app.get('/', (req, res) => res.send("Hello World!"));
app.use("/v2", audioProcessor);

let midStore = new Set();

const users = {};

io.on("connection", (socket) => {
	socket.on("register", (userId) => {
		users[userId] = socket.id;
		console.log(`Registered user ${userId} with socket ID ${socket.id}`);
	});

	socket.on("disconnect", () => {
		for (const [userId, id] of Object.entries(users)) {
			if (id === socket.id) {
				delete users[userId];
				break;
			}
		}
		console.error('user disconnected');
	});
});

app.get('/insta', (req, res) => {
	// Parse the query params
	let mode = req.query["hub.mode"];
	let token = req.query["hub.verify_token"];
	let challenge = req.query["hub.challenge"];

	// Check if a token and mode is in the query string of the request
	if (mode && token) {
		// Check the mode and token sent is correct
		if (mode === "subscribe" && token == config.verifyToken) {
			// Respond with the challenge token from the request
			console.log("WEBHOOK_VERIFIED");
			res.status(200).send(challenge);
		} else {
			// Respond with '403 Forbidden' if verify tokens do not match
			res.sendStatus(403);
		}
	}
});

app.post('/insta', async (req, res) => {
	try {
		const data = req?.body;
		console.log('Data : ', JSON.stringify(data));

		const logMessage = `GET /insta - Body: ${JSON.stringify(data)}`;
		writeLogToFile(logMessage); // Log to file

		if (data?.object !== "page" && data?.object !== "instagram") return;
		if (data?.object === "page") {
			if (
				data &&
				data.entry &&
				Array.isArray(data.entry) &&
				data.entry.length > 0 &&
				data.entry[0].messaging &&
				Array.isArray(data.entry[0].messaging) &&
				data.entry[0].messaging.length > 0 &&
				data.entry[0].messaging[0].message &&
				data.entry[0].messaging[0].message.text
			) {
				try {
					let Message = data.entry[0].messaging[0].message.text
					let SenderId = data.entry[0].messaging[0].sender.id
					let ReceiverId = data.entry[0].messaging[0].recipient.id
					let MessageId = data.entry[0].messaging[0].message.mid

					const API_URLS = [
						"https://api-digitalwall.xploro.io/Facebook/AddInstaDm",
						// "https://api-digitalwall.coitor.com/Facebook/AddInstaDm",
						// "https://api-digitalwall-demo.xploro.io/Facebook/AddInstaDm"
					];

					// let a = await axios.get(`${API_URLS[0]}?SenderId=${SenderId}&ReceiverId=${ReceiverId}&MessageId=${MessageId}&Message=${Message}`)
					// const b = await axios.get(`${API_URLS[1]}?SenderId=${SenderId}&ReceiverId=${ReceiverId}&MessageId=${MessageId}&Message=${Message}`)
					const c = await axios.get(`${API_URLS[0]}/?SenderId=${SenderId}&ReceiverId=${ReceiverId}&MessageId=${MessageId}&Message=${Message}`)
					console.log(`-------- Facebook/AddInstaDm`, c);

					// Convert parameters to URLSearchParams format
					const param = new URLSearchParams();
					param.append("SenderId", String(SenderId));
					param.append("RecipientId", String(ReceiverId));
					param.append("DmMessage", String(Message));

					const API_URL = [
						"https://api-digitalwall.xploro.io/Facebook/ReplyDirectDM_V4",
						// "https://api-digitalwall.coitor.com/Facebook/AddInstaDm",
						// "https://api-digitalwall-demo.xploro.io/Facebook/AddInstaDm"
					];

					Promise.allSettled(
						API_URL.map(url => {
							console.log(`Making POST request to: ${url}`);

							return axios.post(url, param, {
								headers: {
									"Content-Type": "application/x-www-form-urlencoded",
									"Accept": "application/json"
								}
							});
						})
					).then(results => {
						results.forEach((result, index) => {
							if (result.status === "fulfilled") {
								console.log(`Response from API Facebook/ReplyDirectDM_V4----- ${index + 1}:`, result.value.data);
							} else {
								console.error(`Error from API Facebook/ReplyDirectDM_V4----- ${index + 1}:`, result.reason);
							}
						});
					});
				} catch (error) {
					console.log("Error in the overall process:", error);
				}
			}

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
					"https://api-digitalwall.coitor.com/Facebook/ReplyFBCommentAutomationV3",
					"https://api-digitalwall.xploro.io/Facebook/ReplyFBCommentAutomationV4",
					"https://api-digitalwall-demo.xploro.io/Facebook/ReplyFBCommentAutomationV3"
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
				} catch (error) {
					console.error("Error while sending requests to APIs:", error.message);
				}
			}
		} else if (data?.object === "instagram") {
			if (data?.entry[0]?.changes && data?.entry[0]?.changes[0]?.field === "comments") {
				console.log("------------------------------------------------------------------     ReplyCommentAutomationV3     ------------------------------------------------------------------");

				const postId = data.entry[0].changes[0].value?.media?.id;
				const messageText = data.entry[0].changes[0].value?.text;
				const commentId = data.entry[0]?.changes[0].value?.id;
				const recipientID = data.entry[0]?.changes[0].value?.from.id;
				const recipientName = data.entry[0]?.changes[0].value?.from.username;
				const time = data.entry[0]?.time;

				if (postId && messageText && commentId) {
					const API_URLS = [
						"https://api-digitalwall.coitor.com/Instagram/ReplyCommentAutomationV3",
						"https://api-digitalwall.xploro.io/Instagram/ReplyCommentAutomationV4",
						"https://api-digitalwall-demo.xploro.io/Instagram/ReplyCommentAutomationV4"
					];

					const payload = {
						PostId: postId.toString(),
						Message: messageText,
						RecipientID: recipientID,
						RecipientName: recipientName,
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
					} catch (error) {
						console.error("Error: Instagram/ReplyCommentAutomationV3", error);
					}
				}
			} else if (data?.entry[0]?.messaging?.length > 0 &&
				data?.entry[0]?.messaging[0]?.read) {
				console.log("------------------------------------------------------------------     InstaDmReadState     ------------------------------------------------------------------");

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
				} catch (error) {
					console.error("Unexpected error:", error);
				}
			} else {
				if (data?.entry[0]?.messaging?.length > 0 &&
					data?.entry[0]?.messaging[0]?.message
				) {
					console.log("------------------------------------------------------------------     AddInstaDm     ------------------------------------------------------------------");

					const senderId = data.entry[0].messaging[0].sender.id;
					const recipientId = data.entry[0].messaging[0].recipient.id;
					const messageId = data.entry[0].messaging[0].message.mid;
					const message = data.entry[0].messaging[0].message.text;

					if (midStore.has(messageId)) return;
					midStore.add(messageId);

					const API_URLS = [
						// "https://api-digitalwall.coitor.com/Instagram/AddInstaDm/",
						"https://api-digitalwall.xploro.io/Instagram/AddInstaDm/",
						"https://api-digitalwall-demo.xploro.io/Instagram/AddInstaDm/"
					];

					Promise.allSettled(
						API_URLS.map(url => {
							console.log(`Making request to: ${url}`);
							return axios.get(url, {
								params: {
									SenderId: senderId,
									ReceiverId: recipientId,
									MessageId: messageId,
									Message: message
								}
							});
						})
					).then(results => {
						results.forEach((result, index) => {
							if (result.status === "fulfilled") {
								console.log(`Response from API  AddInstaDm----- ${index + 1}:`, result.value.data);
							} else {
								console.error(`Error from API  AddInstaDm----- ${index + 1}:`, result.reason);
							}
						});
					});

					if (senderId && recipientId && message) {
						const API_URLS = [
							// "https://api-digitalwall.coitor.com/Instagram/ReplyDirectDM",
							"https://api-digitalwall.xploro.io/Instagram/ReplyDirectDM_V4",
							"https://api-digitalwall-demo.xploro.io/Instagram/ReplyDirectDM_V4"
						];

						const formData = new FormData();
						formData.append('SenderId', senderId);
						formData.append('DmMessage', message);
						formData.append('RecipientId', recipientId);

						for (const url of API_URLS) {
							try {
								const response = await postRequest(url, senderId, recipientId, message);
								console.log(`Success response from ${url}:`, response);
							} catch (error) {
								console.error(`Error response from ${url}:`, error);
							}
						}
					}
				}
			}
		}

	} catch (error) {
		console.error("Websocket recevier got struck in middle of the sea... ", error);
	} finally {
		io.emit('instaEvent', { method: 'GET', message: "Websocket..." });
		return res.status(200).send('Event received');
	}
});

async function postRequest(url, senderId, recipientId, text) {
	const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(7)}`;
	const formData = [
		`--${boundary}`,
		`Content-Disposition: form-data; name="SenderId"\r\n\r\n${senderId}`,
		`--${boundary}`,
		`Content-Disposition: form-data; name="DmMessage"\r\n\r\n${text}`,
		`--${boundary}`,
		`Content-Disposition: form-data; name="RecipientId"\r\n\r\n${recipientId}`,
		`--${boundary}--`
	].join('\r\n');

	const options = {
		method: 'POST',
		headers: {
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
			'Content-Length': Buffer.byteLength(formData),
			'accept': 'application/json'
		}
	};

	return new Promise((resolve, reject) => {
		const req = https.request(url, options, (res) => {
			let data = '';

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				console.log(JSON.stringify(data))
				resolve(JSON.parse(data));
			});
		});

		req.on('error', (error) => {
			reject(error);
		});

		req.write(formData);
		req.end();
	});
}

app.get('/instagram', (req, res) => {
	// Parse the query params
	let mode = req.query["hub.mode"];
	let token = req.query["hub.verify_token"];
	let challenge = req.query["hub.challenge"];

	// Check if a token and mode is in the query string of the request
	if (mode && token) {
		// Check the mode and token sent is correct
		if (mode === "subscribe" && token == config.verifyToken) {
			// Respond with the challenge token from the request
			console.log("WEBHOOK_VERIFIED");
			res.status(200).send(challenge);
		} else {
			// Respond with '403 Forbidden' if verify tokens do not match
			res.sendStatus(403);
		}
	}
});

app.post('/instagram', (req, res) => {
	console.log("POST  Okkkkkkk -----   User => ", 'Params:', req.params, 'Query:', req.query);
	console.log('Body:', JSON.stringify(req.body));
	// Handle webhook events here

	res.status(200).send('Event received');
});

server.listen(port, '0.0.0.0', () => {
	console.log(`Server running at http://localhost:${port}`);
});