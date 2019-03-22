const connections = require('/opt/connections');
const { wrapWebSocketMethod } = require('/opt/lambda');


// Add ApiGatewayManagementApi to the AWS namespace
//require('aws-sdk/clients/apigatewaymanagementapi');

// const s3 = new AWS.S3()

// const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

// const { SESSION_TABLE_NAME, CONNECTION_TABLE_NAME, FILE_BUCKET_NAME } = process.env;
// const DEFAULT_SESSION_LENGTH_MINS = 15;
// const MAX_SESSION_LENGTH_MINS = 120; // 2 hours
// const DEFAULT_MAX_NO_FILES = 10;
// const DEFAULT_MAX_FILE_SIZE = 4194304; // 4MB

// function randomId() {
//   return crypto.randomBytes(16).toString('hex');
// }

exports.handler = wrapWebSocketMethod(async (event, context, wsSend) => {
  const uploadInitEvent = JSON.parse(event.body);
  let connectionId = event.requestContext.connectionId;
  
  // Get SessionId
  let connectionDetails = (await connections.getConnectionDetails(connectionId)).Item;

  let fileCount = uploadInitEvent.fileCount;
  // Generate FileIds

  // Generate Presigned S3
  let a = wsSend({type: "this"});
  let b = wsSend({type: "is"});
  let c = wsSend({type: "a"});
  let d = wsSend({type: "test"});

  await Promise.all([a, b, c, d]);

  throw "whoops";
});


// try {
//   await apigwManagementApi.postToConnection(
//     { ConnectionId: connectionId,
//       Data: JSON.stringify({
//         egassem:egassem,
//         domainName: event.requestContext.domainName,
//         stage: event.requestContext.stage
//       })
//     }
//   ).promise();
// } catch (e) {
//   if (e.statusCode === 410) {
//     console.log(`Found stale connection, deleting ${connectionId}`);
//     // await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
//   } else {
//     throw e;
//   }
// }

// return {
//   statusCode: 200,
// };

// const connectionId = event.requestContext.connectionId;
// const reconnectEvent = JSON.parse(event.body);
// const sessionId = reconnectEvent.sessionId;
// const hostKey = reconnectEvent.hostKey;

// if (sessionData.hostKey !== hostKey) {
//   console.log("Hostkey " + hostKey + "does not match hostKey in sessionData:" + sessionData.hostKey);
//   // TODO return actual error
//   return { statusCode: 403, body: "Invalid hostKey" };
// }

// var createConnectionParams = {
//   TableName: CONNECTION_TABLE_NAME,
//   Item: {
//     connectionId: connectionId,
//     sessionId:    sessionId,
//   }
// };

// let createConnectionPromise = DDB.put(createConnectionParams, function (err) {
//   if (err) {
//     console.log("error getting connection:" + JSON.stringify(err));
//     console.error("Error creating session" + JSON.stringify(err));
//   }
// }).promise();

// let addConnectionToSessionPromise = DDB.update({
//   TableName: SESSION_TABLE_NAME,
//   Key: { sessionId : sessionId },
//   UpdateExpression: 'ADD connections :c',
//   ExpressionAttributeValues: {
//     ':c' : DDB.createSet([connectionId])
//   }
// }, function (err) {
//   if (err) {
//     console.log("error getting connection:" + JSON.stringify(err));
//     return {
//       statusCode: err ? 500 : 200,
//       body: err ? "Failed to disconnect: " + JSON.stringify(err) : "Disconnected."
//     };
//   }
// }).promise();

// await createConnectionPromise;
// await addConnectionToSessionPromise;

// let sessionDataBody = {
//   type: "sessionData",
//   expiry:   new Date(sessionData.expiry * 1000),
//   maxFiles: sessionData.maxFiles,
//   maxSize:  sessionData.maxSize,
//   files:    sessionData.files
// };

// const apigwManagementApi = new AWS.ApiGatewayManagementApi({
//   apiVersion: '2018-11-29',
//   endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
// });

// try {
//   await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(sessionDataBody)}).promise();
// } catch (e) {
//   if (e.statusCode === 410) {
//     console.log(`Found stale connection, deleting ${connectionId}`);
//     // await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
//   } else {
//     throw e;
//   }
// }

// console.log(JSON.stringify(event));

// let sessionId = event.pathParameters.sessionId;
// console.log(sessionId);

// let sessionDataResult = await DDB.get({TableName: SESSION_TABLE_NAME, Key: { sessionId: sessionId }}, function (err) {
//   if (err) {
//     console.log("error getting connection:" + JSON.stringify(err));
//     return {
//       statusCode: 500,
//       body: "Internal Server Error"
//     };
//   }
// }).promise();
// console.log(JSON.stringify(sessionDataResult));
// let sessionData = sessionDataResult.Item;
// if (sessionData === undefined) {
//   return { statusCode: 404, body: JSON.stringify({ message: "session not found" }) };
// }
// console.log("found session with id:" + sessionId + JSON.stringify(sessionData));

// let fileId = randomId();

// return { statusCode: 200, body: JSON.stringify({ fileId: fileId }) };
