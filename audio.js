"use strict";

// const fetch = require("node-fetch").default;
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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

		const { Url, StaffId, StartTime, EndTime } = req.body;
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
				"volume=3.0",
				// "highpass=f=200",
				// "lowpass=f=3000",
				// "afftdn=nr=20",
			])
			.on("end", async () => {
				console.timeEnd("Processing Time");
				console.log("Processing finished!");

				// Prepare form data
				const formData = new FormData();
				formData.append("StaffId", StaffId);
				formData.append("StartTime", StartTime);
				formData.append("EndTime", EndTime);
				formData.append("Recording", fs.createReadStream(outputFilePath), {
					filename: `processed_audio_${requestId}.mp3`,
					contentType: "audio/mp3",
				});

				try {
					const response = await fetch(`${Url}Register/CreateCallRecording`, {
						method: "POST",
						headers: {
							Authorization: `${req?.headers?.authorization}`,
						},
						body: formData,
					});

					const result = await response.json();

					// Clean up files asynchronously
					fs.unlink(tempInputPath, (err) => {
						if (err) console.error("Error deleting temp input file:", err);
					});
					fs.unlink(outputFilePath, (err) => {
						if (err) console.error("Error deleting processed audio file:", err);
					});

					console.log(result, ".....", req?.headers?.authorization);
					res.json(result?.CallRecordingKey ? {
						success: true,
						data: { CallRecordingKey: result?.CallRecordingKey },
					} : { success: false, message: "CallRecordingKey not found" });

				} catch (fetchError) {
					console.error("Error sending file:", fetchError);
					res.status(500).send({ success: false, message: "Error sending audio file" });
				}
			})
			.on("error", (err) => {
				console.error("FFmpeg Error:", err);
				res.status(500).send({ success: false, message: "Error processing audio" });
			})
			.save(outputFilePath);
	} catch (error) {
		console.error("Error:", error);
		res.status(500).send({ success: false, message: "Error request processing audio" });
	}
});

module.exports = app;