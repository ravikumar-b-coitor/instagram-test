"use strict";

// const fetch = require("node-fetch").default;
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const ffmpeg = require("fluent-ffmpeg");
const FormData = require("form-data");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const { v4: uuidv4 } = require("uuid");
const upload = multer({ storage: multer.memoryStorage() }); // Store in memory, not disk

app.post("/process", upload.single("Recording"), async (req, res) => {
	try {
		if (!req.file) return res.status(400).send("No audio file uploaded");
		console.time("Processing Time");

		const { url, staff_id, start_time, end_time, CallDuration, store_id } = req.body;
		console.log("Fields:", url, staff_id, start_time, end_time, CallDuration);

		const requestId = uuidv4(); // Generate unique ID per request

		// Determine input file format
		const inputFormat = req.file.mimetype.split("/")[1];
		const tempInputPath = path.join(__dirname, `temp_audio_${requestId}.${inputFormat}`);
		const outputFilePath = path.join(__dirname, `processed_audio_${requestId}.mp3`);

		// Write buffer to a temporary file
		fs.writeFileSync(tempInputPath, req.file.buffer);

		// Process audio with FFmpeg
		ffmpeg()
			.input(tempInputPath)
			.format("mp3")
			.audioFilters([
				"volume=2.0",
				// "highpass=f=200",
				// "lowpass=f=3000",
				// "afftdn=nr=20",
			])
			.on("end", async () => {
				console.timeEnd("Processing Time");
				console.log("Processing finished!");

				// Prepare form data
				const formData = new FormData();
				formData.append("staff_id", staff_id);
				formData.append("start_time", start_time);
				formData.append("end_time", end_time);
				formData.append("CallDuration", CallDuration);
				formData.append("store_id", store_id);
				formData.append("Recording", fs.createReadStream(outputFilePath), {
					filename: `processed_audio_${requestId}.mp3`,
					contentType: "audio/mp3",
				});

				try {
					const response = await fetch(`${url}`, {
						method: "POST",
						headers: {
							Authorization: `${req?.headers?.authorization}`,
						},
						body: formData,
					});

					const result = await response.json();

					console.log(result, ".....", req?.headers?.authorization);
					return res.json(result?.id ? {
						success: true,
						data: result,
					} : { success: false, message: "CallRecordingKey not found" });

				} catch (fetchError) {
					console.error("Error sending file:", fetchError);
					res.status(500).send({ success: false, message: "Error sending audio file" });
				} finally {
					// Cleanup files in all cases
					// fs.unlink(tempInputPath, (err) => {
					// 	if (err) console.error("Error deleting temp input file:", err);
					// 	else console.log(`Deleted temp input file: ${tempInputPath}`);
					// });

					// fs.unlink(outputFilePath, (err) => {
					// 	if (err) console.error("Error deleting processed audio file:", err);
					// 	else console.log(`Deleted processed audio file: ${outputFilePath}`);
					// });
				}
			})
			.on("error", (err) => {
				console.error("FFmpeg Error:", err);
				return res.status(500).send({ success: false, message: "Error processing audio" });
			})
			.save(outputFilePath);
	} catch (error) {
		console.error("Error:", error);
		return res.status(500).send({ success: false, message: "Error request processing audio" });
	}
});

module.exports = app;