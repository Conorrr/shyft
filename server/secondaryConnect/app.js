const connections = require('/opt/connections');
const sessions = require('/opt/sessions');
const s3 = require('/opt/s3');
const errors = require('/opt/errors');
const { wrapWebSocketMethod } = require('/opt/lambda');

exports.handler = wrapWebSocketMethod(async (event, context, wsSend) => {
  const secondaryConnectEvent = JSON.parse(event.body);
  const connectionId = event.requestContext.connectionId;
  const sessionId = secondaryConnectEvent.sessionId;
  const isHost = secondaryConnectEvent.type == 'reconnect';

  // get session
  const session = (await sessions.getSessionDetails(sessionId)).Item;

  if (!session || new Date(session.expiry * 1000) < new Date()) {
    await wsSend(errors.errorMessageBody(errors.codes.ENDED));
    return;
  }

  if (isHost && session.hostKey !== secondaryConnectEvent.hostKey) {
    await wsSend(errors.errorMessageBody(errors.codes.BAD_AUTH));
    return;
  }

  // add connection to sessions
  let addSessionPromise = connections.createConnection(connectionId, sessionId, isHost);

  // add session to connections
  let addConnectionPromise = sessions.addConnection(sessionId, connectionId);

  await Promise.all([addSessionPromise, addConnectionPromise]);

  const expiry = session.expiry - Math.floor(new Date().getTime() / 1000);

  let files = []
  for (fileObj of session.files) {
    if (fileObj.status == 'UPLOADED') {
      files.push({
        id: fileObj.id,
        name: fileObj.filename,
        type: fileObj.type,
        url: s3.generateGetUrl(sessionId, fileObj.id, expiry),
        size: fileObj.size
      });
    }
  }

  await wsSend({
    type: "sessionData",
    expiry: new Date(session.expiry * 1000),
    maxFiles: session.maxFiles,
    maxSize: session.maxSize,
    files: files
  });
});