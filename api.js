const fs = require('fs');
const awsSdk = require('aws-sdk');
const path = require('path');
const window = require('global/window');

awsSdk.config.update({region:'ap-southeast-2'});

const BUCKET_NAME = "subsync";
const INPUT_FOLDER = "subsync-input";
const OUTPUT_FOLDER = "subsync-output";

const s3 = new awsSdk.S3({
    accessKeyId: "AKIA5HQHA7PO3NRC5ZUB",
    secretAccessKey: "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"
});

module.exports.uploadAudioToS3 = function(fileName) {
    
    const filePath = __dirname + '/public/' + fileName;
    console.log("File path: " + filePath);

    const params = {
        Bucket: BUCKET_NAME,
        Body: fs.createReadStream(filePath),
        Key: "input-subsync/" + fileName
    };

    s3.upload(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log(data);
            test(fileName);
        }
    });
}

module.exports.getJsonScript = function(fileName) {
    
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
            if (window.intervalId) {
                clearInterval(window.intervalId);
                intervalId = null;
            }
            const filePath = __dirname + '/public/output/' + fileName + ".json";
            console.log("Output file path: " + filePath);
            fs.writeFile(filePath, data.Body.toString());
        }
    })
}

function test(fileName) {
    const transcribeService = new awsSdk.TranscribeService();

    const recordUrl = "https://s3-ap-southeast-2.amazonaws.com/" + BUCKET_NAME + "/input-subsync/" + fileName;
    console.log("Record URL: " + recordUrl);
    const transcriptionJobName = fileName;

    transcribeService.startTranscriptionJob({
        LanguageCode: "en-US",
        Media: { MediaFileUri: recordUrl },
        MediaFormat: 'mp4',
        TranscriptionJobName: transcriptionJobName,
        OutputBucketName: "subsync",
    }, function(err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log(data);
        }
    });
}