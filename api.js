const fs = require('fs');
const awsSdk = require('aws-sdk');
const path = require('path');
const window = require('global/window');
var ffmpeg = require('fluent-ffmpeg');
const request = require('request');
const axios = require('axios');

awsSdk.config.update({
    region:'ap-southeast-2',
    accessKeyId: "AKIA5HQHA7POZMSTVM57",
    secretAccessKey: "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"
});

const BUCKET_NAME = "subsync";
const INPUT_FOLDER = "subsync-input";
const OUTPUT_FOLDER = "subsync-output";

const s3 = new awsSdk.S3();

function uploadAudioToS3(fileName) {
    
    const filePath = __dirname + '/public/' + fileName + ".mp3";
    console.log("File path: " + filePath);

    const params = {
        Bucket: BUCKET_NAME,
        Body: fs.createReadStream(filePath),
        Key: "input-subsync/" + fileName + ".mp3"
    };

    s3.upload(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log(data);
            test(fileName);
        }
    });
}

function getJsonScript(fileName, res) {
    
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName + ".json"
    }

    s3.getObject(params, function(err, data) {
        if (err) {
            // console.log(err, err.stack);
            console.log(Date.now() + " not yet");
        }
        else {
            if (window.intervalId){
                clearInterval(window.intervalId);
                window.intervalId = null;
            }
            const filePath = __dirname + '/public/output/' + fileName + ".json";
            console.log("Output file path: " + filePath);
            //getSrtfromJson(fileName, res);
            fs.writeFile(filePath, data.Body.toString(), function(err) {
                if(err) {
                    console.log(err);
                }
                console.log("File saved successfully!");
                // getSrtfromJson(fileName, res);
                res.render('laststep', { filename: `${fileName}` });
            });
        }
    })
}

function getSrtfromJson(userText, fileName, res) {
    console.log("go get srt from json");
    if (!fs.existsSync(__dirname + '/public/output/' + fileName + ".json")) return;
    console.log("start get srt from json");
    fs.readFile(__dirname + '/public/output/' + fileName + ".json", function(err, data) {
        const formData = {
            aws_script: JSON.stringify(JSON.parse(data)),
            user_script: userText
        };
        console.log(formData);
        request.post({url:'https://99ad0a04.ngrok.io/', formData: formData}, function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('upload failed:', err);
            }
            console.log('Upload successful!  Server responded with:');
            const filePath = __dirname + '/public/output/' + fileName + ".srt";
            fs.writeFileSync(filePath, body, function(err) {
                if(err) {
                    return console.log(err);
                }
            });
            console.log("File srt saved successfully!");
            combineVideoandScript(fileName, res);
        });
        console.log("here");
    });
    
}

function combineVideoandScript(fileName, res) {
    ffmpeg(__dirname + '/public/' + fileName)
            .outputOptions(
                "-vf subtitles=" + __dirname + '/public/output/' + fileName + '.srt'
            )
            .on('error', function(err) {
                console.log('Error: ' + err.message);
            })
            .save(__dirname + '/public/' + fileName + '_final.mp4')
            .on('end', function() {
                res.render('result', { filename: `${fileName}_final.mp4` });
                console.log("Done saving");
            });
}

module.exports = {
    combineVideoandScript,
    uploadAudioToS3,
    getJsonScript,
    getSrtfromJson
}

function test(fileName) {
    const transcribeService = new awsSdk.TranscribeService();

    const recordUrl = "https://s3-ap-southeast-2.amazonaws.com/" + BUCKET_NAME + "/input-subsync/" + fileName + ".mp3";
    console.log("Record URL: " + recordUrl);
    const transcriptionJobName = fileName;

    transcribeService.startTranscriptionJob({
        LanguageCode: "en-US",
        Media: { MediaFileUri: recordUrl },
        MediaFormat: 'mp3',
        TranscriptionJobName: transcriptionJobName,
        OutputBucketName: "subsync",
    }, function(err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log(data);
        }
    });
}