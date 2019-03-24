const AWS = require('aws-sdk');
const s3 = new AWS.S3({apiVersion: '2006-03-01', signatureVersion: "v4"});
const { FILE_BUCKET_NAME } = process.env;

function path(sessionId, fileId) {
    return `${sessionId}/${fileId}`;
}

exports.generatePutUrl = (sessionId, fileId, expires) => {
    // expires relates to when the put url expires no the object, should be time in seconds not an absolute time
    return s3.getSignedUrl('putObject', {
        Bucket  : FILE_BUCKET_NAME,
        Key     : path(sessionId, fileId),
        Expires : expires
    });
}

exports.extendExpiry = async (sessionId, fileId, expiry) => {

}

exports.deleteItem = async (sessionId, fileId) => {
    // delete file if it's too big or if the file is somehow uploaded after a session has expired
}

exports.setExpiryAndHeaders = async (sessionId, fileId, expiry) => {
    // after new file is seen in s3 update it with proper permissions
}

exports.generateGetUrl = async (sessionId, fileId) => {

}