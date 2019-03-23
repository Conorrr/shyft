const connections = require('/opt/connections');
const sessions = require('/opt/sessions');
const errors = require('/opt/errors');
const { wrapWebSocketMethod } = require('/opt/lambda');

exports.handler = wrapWebSocketMethod(async (event, context, wsSend) => {
  const secondaryConnectEvent = JSON.parse(event.body);
  const connectionId = event.requestContext.connectionId;
  const sessionId = secondaryConnectEvent.sessionId;

  // get session
  const session = (await sessions.getSessionDetails(sessionId)).Item;

  if (!session) {
    await wsSend(errors.errorMessageBody(errors.codes.ENDED));
    return;
  }

  // add connection to sessions
  let addSessionPromise = connections.createConnection(connectionId, sessionId);

  // add session to connections
  let addConnectionPromise = sessions.addConnection(sessionId, connectionId);

  await Promise.all([addSessionPromise, addConnectionPromise]);

  await wsSend({
    type: "sessionData",
    expiry: new Date(session.expiry * 1000),
    maxFiles: session.maxFiles,
    maxSize: session.maxSize,
    files: [] // todo 
  });
});