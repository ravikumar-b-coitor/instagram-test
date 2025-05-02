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

		writeLogToFile(`GET /insta - Body: ${JSON.stringify(data)}`); // Log to file

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
						"https://api-digitalwall-demo.xploro.io/Facebook/AddInstaDm"
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
						"https://api-digitalwall-demo.xploro.io/Facebook/ReplyDirectDM_V4"
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
					"https://api-digitalwall-demo.xploro.io/Facebook/ReplyFBCommentAutomationV4"
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
						// "https://api-digitalwall.coitor.com/Instagram/ReplyCommentAutomationV3",
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
								console.log(`✅ Success response from ${API_URLS[index]}:`, result.value.data);
							} else {
								const error = result.reason;
								if (error.response) {
									// Server responded with a status other than 2xx
									console.error(`❌ Error from ${API_URLS[index]}:`, {
										status: error.response.status,
										statusText: error.response.statusText,
										data: error.response.data,
									});
								} else if (error.request) {
									// No response received
									console.error(`❌ No response from ${API_URLS[index]}:`, error.request);
								} else {
									// Other errors
									console.error(`❌ Axios setup error for ${API_URLS[index]}:`, error.message);
								}
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

const postRequest = async (url, senderId, recipientId, message) => {
	const formData = new FormData();
	formData.append('SenderId', senderId);
	formData.append('DmMessage', message);
	formData.append('RecipientId', recipientId);

	try {
		const response = await axios.post(url, formData, {
			headers: formData.getHeaders ? formData.getHeaders() : {},
		});

		if (typeof response.data === 'string') {
			try {
				return JSON.parse(response.data); // Try parsing only if needed
			} catch (parseError) {
				console.warn(`⚠️ Non-JSON response from ${url}:`, response.data);
				return { Status: 0, Msg: 'Non-JSON response' };
			}
		}

		return response.data;
	} catch (error) {
		console.error(`❌ Error in postRequest to ${url}:`, error.message);
		if (error.response) {
			console.error(`❌ Server response:`, error.response.data);
			return error.response.data;
		}
		throw error; // unexpected issue
	}
};


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

app.post('/instagram', async (req, res) => {
	try {
		console.log("POST  Okkkkkkk ----- User =>", 'Params:', req.params, 'Query:', req.query);
		console.log('Body:', JSON.stringify(req.body));

		const data = req.body;

		if (data?.object !== "instagram") {
			return res.status(200).send('Not an Instagram object');
		}

		const entry = data.entry?.[0];

		// Handle Comment Replies
		if (entry?.changes?.[0]?.field === "comments") {
			console.log("----- ReplyCommentAutomationV3 -----");

			const value = entry.changes[0].value;
			const postId = value?.media?.id;
			const messageText = value?.text;
			const commentId = value?.id;
			const recipientID = value?.from?.id;
			const recipientName = value?.from?.username;
			const time = entry?.time;

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

				const results = await Promise.allSettled(
					API_URLS.map(url =>
						axios.post(url, payload, {
							headers: {
								'Content-Type': 'application/json',
								'accept': 'application/json'
							}
						})
					)
				);

				results.forEach((result, index) => {
					if (result.status === 'fulfilled') {
						console.log(`✅ Success from ${API_URLS[index]}:`, result.value.data);
					} else {
						console.error(`❌ Error from ${API_URLS[index]}:`, result.reason?.message);
					}
				});
			}
		}

		// Handle DM Read Events
		else if (entry?.messaging?.[0]?.read) {
			console.log("----- InstaDmReadState -----");

			const API_URLS = [
				"https://api-digitalwall.coitor.com/Instagram/InstaDmReadState",
				"https://api-digitalwall.xploro.io/Instagram/InstaDmReadState",
				"https://api-digitalwall-demo.xploro.io/Instagram/InstaDmReadState"
			];

			const read = entry.messaging[0].read;
			const sender = entry.messaging[0].sender;
			const recipient = entry.messaging[0].recipient;

			const payload = {
				MessageId: read.mid,
				SenderId: sender.id,
				ReceiverId: recipient.id
			};

			const results = await Promise.allSettled(
				API_URLS.map(url =>
					axios.post(url, payload, {
						headers: {
							'Content-Type': 'application/json',
							'accept': 'application/json'
						}
					})
				)
			);

			results.forEach((result, index) => {
				if (result.status === 'fulfilled') {
					console.log(`✅ Read success from ${API_URLS[index]}:`, result.value.data);
				} else {
					console.error(`❌ Read error from ${API_URLS[index]}:`, result.reason?.message);
				}
			});
		}

		// Handle Direct Messages
		else if (entry?.messaging?.[0]?.message) {
			console.log("----- AddInstaDm -----");

			const msg = entry.messaging[0];
			const senderId = msg.sender.id;
			const recipientId = msg.recipient.id;
			const messageId = msg.message.mid;
			const message = msg.message.text;

			if (!midStore.has(messageId)) {
				midStore.add(messageId);

				const ADD_URLS = [
					"https://api-digitalwall.xploro.io/Instagram/AddInstaDm/",
					"https://api-digitalwall-demo.xploro.io/Instagram/AddInstaDm/"
				];

				console.log("---- AddInstaDm Results ----");

				await Promise.allSettled(
					ADD_URLS.map(url =>
						axios.get(url, {
							params: {
								SenderId: senderId,
								ReceiverId: recipientId,
								MessageId: messageId,
								Message: message
							}
						})
							.then(response => ({ url, data: response.data }))
							.catch(error => {
								throw { url, error };
							})
					)
				).then(results => {
					results.forEach(result => {
						if (result.status === 'fulfilled') {
							console.log(`✅ Add DM Success [${result.value.url}]:`, result.value.data);
						} else {
							console.error(`❌ Add DM Error [${result.reason.url}]:`, result.reason.error?.message);
						}
					});
				});
			}

			if (senderId && recipientId && message) {
				const REPLY_URLS = [
					"https://api-digitalwall.xploro.io/Instagram/ReplyDirectDM_V4",
					"https://api-digitalwall-demo.xploro.io/Instagram/ReplyDirectDM_V4"
				];

				console.log("---- ReplyDirectDM Results ----");

				for (const url of REPLY_URLS) {
					try {
						const response = await postRequest(url, senderId, recipientId, message);
						console.log(`✅ Reply DM success [${url}]:`, response);
					} catch (err) {
						console.error(`❌ Reply DM error [${url}]:`, err?.response?.data || err.message);
					}
				}
			}
		}

		res.status(200).send('Event received');

	} catch (err) {
		console.error("🚨 Internal Server Error:", err.message);
		res.status(500).send('Internal Server Error');
	} finally {
		io.emit('instaEvent', { method: 'GET', message: "Websocket..." });
		return res.status(200).send('Event received');
	}
});

server.listen(port, '0.0.0.0', () => {
	console.log(`Server running at http://localhost:${port}`);
});