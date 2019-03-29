const connections = require('/opt/connections');
const sessions = require('/opt/sessions');
const s3 = require('/opt/s3');
const crypto = require("crypto");
const { wrapWebSocketMethod } = require('/opt/lambda');
const errors = require('/opt/errors');

function randomId() {
  return crypto.randomBytes(16).toString('hex');
}

exports.handler = wrapWebSocketMethod(async (event, context, wsSend) => {
  const uploadInitEvent = JSON.parse(event.body);
  let connectionId = event.requestContext.connectionId;

  let files = uploadInitEvent.files;

  if (files === undefined || !Array.isArray(files) || files.length < 1) {
    await wsSend(errors.errorMessageBody(errors.codes.INVALID_REQUEST));
    return;
  }

  // Get SessionId
  let connectionDetails = (await connections.getConnectionDetails(connectionId)).Item;

  if (connectionDetails == undefined || connectionDetails.sessionId == undefined) {
    await wsSend(errors.errorMessageBody(errors.codes.NOT_CONNECTED));
    return;
  }

  let sessionId = connectionDetails.sessionId;

  // get session
  const session = (await sessions.getSessionDetails(sessionId)).Item;

  if (!session || new Date(session.expiry * 1000) < new Date()) {
    if (!session) {
      console.log(`session not found ${sessionId}`);
    } else {
      console.log(`session already ended, ended at: ${new Date(session.expiry * 1000)}`);
    }
    await wsSend(errors.errorMessageBody(errors.codes.ENDED));
    return;
  }

  if (session.files.length + files.length > session.maxFiles) {
    console.log(`Uploading that number of files will put session over maxFiles limit ${session.files.length} + ${files.length} > ${session.maxFiles}`);
    await wsSend(errors.errorMessageBody(errors.codes.TOO_MANY_FILES));
    return;
  }

  let presignedUrlBody = {};
  let sessionsFiles = [];

  let expires = session.expiry - Math.floor(new Date().getTime() / 1000);

  for (file of files) {
    let fileId = randomId();
    let url = s3.generatePutUrl(sessionId, fileId, file.type, expires);

    presignedUrlBody[file.tempId] = {
      id: fileId,
      name: file.filename,
      url: url
    };

    sessionsFiles.push({
      id: fileId,
      filename: file.filename,
      type: file.type ? file.type: 'None',
      status: 'PENDING'
    });
  }

  await sessions.addFiles(sessionId, sessionsFiles);
  await wsSend({ type: "presignedUrl", presignedUrls: presignedUrlBody });
});