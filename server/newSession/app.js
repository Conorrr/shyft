const AWS = require('aws-sdk');
const crypto = require("crypto");
// Add ApiGatewayManagementApi to the AWS namespace
require('aws-sdk/clients/apigatewaymanagementapi');

const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const { SESSION_TABLE_NAME, CONNECTION_TABLE_NAME } = process.env;
const DEFAULT_SESSION_LENGTH_MINS = 15;
const MAX_SESSION_LENGTH_MINS = 120; // 2 hours
const DEFAULT_MAX_NO_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 4194304; // 4MB

function randomId() {
  return crypto.randomBytes(16).toString('hex');
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes*60000);
}

exports.handler = async (event, context) => {
  let sessionId = randomId();
  let hostKey = randomId();
  let created = new Date();
  let expiry = addMinutes(created, DEFAULT_SESSION_LENGTH_MINS); 
  let connectionId = event.requestContext.connectionId;

  var createSessionParams = {
    TableName: SESSION_TABLE_NAME,
    Item: {
      sessionId:   sessionId,
      hostKey:     hostKey,
      created:     Math.floor(created.getTime() / 1000),
      expiry:      Math.floor(expiry.getTime() / 1000),
      maxFiles:    DEFAULT_MAX_NO_FILES,
      maxSize:     DEFAULT_MAX_FILE_SIZE,
      connections: DDB.createSet([
        connectionId
      ]),
      files:       []
    }
  };

  let createSessionPromise = DDB.put(createSessionParams, function (err) {
    if (err) {
      console.error("Error creating session" + JSON.stringify(err));
    }
  }).promise();

  var createConnectionParams = {
    TableName: CONNECTION_TABLE_NAME,
    Item: {
      connectionId: connectionId,
      sessionId:    sessionId,
    }
  };

  let createConnectionPromise = DDB.put(createConnectionParams, function (err) {
    if (err) {
      console.error("Error creating session" + JSON.stringify(err));
    }
  }).promise();
  
  await createSessionPromise;
  await createConnectionPromise;

  let newSessionBody = {
      type: "newSessionCreated",
      sessionId: sessionId,
      hostKey: hostKey,
      expiry: expiry,
      maxFiles: DEFAULT_MAX_NO_FILES,
      maxSize: DEFAULT_MAX_FILE_SIZE
    };

    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
    });

    try {
      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(newSessionBody) }).promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        // await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw e;
      }
    }

  return { statusCode: 200, body: 'Data sent.' };
};