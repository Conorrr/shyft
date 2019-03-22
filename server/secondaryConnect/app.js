const connections = require('/opt/connections');
const sessions = require('/opt/sessions');
const { wrapWebSocketMethod } = require('/opt/lambda');

exports.handler = wrapWebSocketMethod(async (event, context, wsSend) => {
  const connectEvent = JSON.parse(event.body);
  const connectionId = event.requestContext.connectionId;
  const sessionId = connectEvent.sessionId;

  // get session
  const session = sessions.getSession();

  if(!sessions) {
    throw "session not found";
  }

  // add connection to sessions
  connections.addSession(sessionId, connectionId);

  // add session to connections
  sessions.addConnection(connectionId, sessionId);

  await wsSend({
    type: "sessionData",
    maxFiles: session.maxFiles,
    maxSize: session.maxSize,
    files: [] // todo 
  });
});