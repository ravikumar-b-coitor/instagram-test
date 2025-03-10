"use strict";

const ffmpeg = require("fluent-ffmpeg");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch").default;
const FormData = require("form-data");
const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Store in memory, not disk

app.post("/process", upload.single("Recording"), async (req, res) => {
	try {
		if (!req.file) return res.status(400).send("No audio file uploaded");
		console.time("Processing Time");

		const {url, StaffId, StartTime, EndTime } = req.body;

		// Determine input file format
		const inputFormat = req.file.mimetype.split("/")[1];
		const tempInputPath = path.join(__dirname, `temp_audio.${inputFormat}`);
		const outputFilePath = path.join(__dirname, "processed_audio.mp3");

		// Write buffer to a temporary file
		fs.writeFileSync(tempInputPath, req.file.buffer);

		// Process audio with FFmpeg
		ffmpeg()
			.input(tempInputPath)
			.format("mp3")
			.audioFilters([
				"volume=5.0",
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
					filename: "processed_audio.mp3",
					contentType: "audio/mp3",
				});

				// Send the processed audio via fetch
				try {
					const response = await fetch(`${url}Register/CreateCallRecording`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${req.headers.authorization}`,
						},
						body: formData,
					});

					const result = await response.json();

					// Clean up files
					fs.unlinkSync(tempInputPath);
					fs.unlinkSync(outputFilePath);

					// Send response
					res.json({
						success: true,
						data: {
							CallRecordingKey: result?.CallRecordingKey,
						},
					});
				} catch (fetchError) {
					console.error("Error sending file:", fetchError);
					res.status(500).send("Error sending audio file");
				}
			})
			.on("error", (err) => {
				console.error("FFmpeg Error:", err);
				res.status(500).send("Error processing audio");
			})
			.save(outputFilePath);
	} catch (error) {
		console.error("Error:", error);
		res.status(500).send("Error processing audio");
	}
});

module.exports = app;