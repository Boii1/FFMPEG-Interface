const ffmpeg = require("fluent-ffmpeg");
const {getVideoDurationInSeconds} = require("get-video-duration");
const formidable = require("formidable");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

let deleteFolderRecursive = (path) => {
  if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach((file) => {
        var curPath = path + "/" + file;
          if(fs.lstatSync(curPath).isDirectory()) { // recurse
              deleteFolderRecursive(curPath);
          } else { // delete file
              fs.unlinkSync(curPath);
          }
      });
      fs.rmdirSync(path);
    }
};

deleteFolderRecursive(__dirname + "/out/");
fs.mkdir(__dirname + "/out", (err) => {
	if (err) console.log(err);
});

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

app.get("/theme", (req, res) => {
	res.sendFile(__dirname + "/theme.css");
});

app.use("/dl", express.static(__dirname + "/out/"));

app.post("/upload", (req, res) => {
	res.set("Content-Type", "text/html");
	let form = formidable.IncomingForm();
	form.maxFileSize = 4096 * 1024 * 1024;
	form.parse(req, (err, fields, files) => {
		try {
			getVideoDurationInSeconds(files.upload.path)
			.then((duration) => {
				ffmpeg.setFfmpegPath(__dirname + "/ffmpeg.exe");
				let proc = ffmpeg(files.upload.path)
					// Options
					.videoBitrate(fields.vBits)
					.size(fields.size + "%")
					.fps(fields.fps)
					.audioBitrate(fields.aBits)
					.audioChannels(fields.channels)
					/*.complexFilter([
						{

						},
						{
							filter: "acrusher",
							options: {
								level_in: ".1",
								level_out: "1",
								bits: "64",
								mix: "0",
								mode: "log"
							},
							input: "audio",
						    outputs: "output"
						}
					], "output")*/
					// Options
					.on("start", () => {
						res.write("Started converting file.<br>")
					})
					.on('progress', function(progress) {
						let splittedprog = progress.timemark.split(":");
						seconds = 0;
						if (typeof(splittedprog) == "undefined") {
							seconds = prog.timemark;
						} else {
							if (typeof(splittedprog[3]) != "undefined") {
								seconds = parseInt(splittedprog[0]) * 24 * 60 * 60 + parseInt(splittedprog[1]) * 60 * 60 + parseInt(splittedprog[2]) * 60 + parseInt(splittedprog[3]);
							} else if (typeof(splittedprog[2]) != "undefined") {
								seconds = parseInt(splittedprog[0]) * 60 * 60 + parseInt(splittedprog[1]) * 60 + parseInt(splittedprog[2]);
							} else if (typeof(splittedprog[1]) != "undefined") {
								seconds = parseInt(splittedprog[0]) * 60 + parseInt(splittedprog[1]);
							} else if (typeof(splittedprog[0]) != "undefined") {
								seconds = parseInt(splittedprog[0]);
							}
						}
						res.write((Math.floor((seconds / duration) * 10000) / 100) + "%<br>")
					})
					.on("end", () => {
						res.write("Converted successfully.<br>");
						res.end("Click <a href='/dl/" + path.basename(files.upload.path) + "." + fields.format + "'>here</a> to download your file.<br><br>If you have any questions, contact me on Discord at eM-Krow#4944");
					})
					.on("error", (err) => {
						res.write("Error: " + err.message + "<br>");
						console.log("Error: " + err.message);
					})
					// Output
					.save(__dirname + "/out/" + path.basename(files.upload.path) + "." + fields.format);
			})
		} catch (error) {
			res.end("Error occurred.\n\nPossible issues:\n - File is corrupt.\n - File is not in a supported or proper media format.\n - File exceeds 4096 MB.\n - Browser doesn't support memory upload of over 2048 MB.");
		}
		
	});
});

app.listen(2000);