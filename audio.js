"use strict";

const ffmpeg = require("fluent-ffmpeg");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Store in memory, not disk

app.post("/process", upload.single("audio"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).send("No audio file uploaded");
		}

		console.time("Processing Time");

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
				"highpass=f=200",
				"lowpass=f=3000",
				"volume=5.0",
				"afftdn=nr=20",
			])
			.on("end", () => {
				console.timeEnd("Processing Time");
				console.log("Processing finished!");

				// Delete temp file
				fs.unlinkSync(tempInputPath);

				// Send the processed file
				res.download(outputFilePath, "processed.mp3", () => {
					// Remove output file after sending
					fs.unlinkSync(outputFilePath);
				});
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