const sessions = require('/opt/sessions');
const s3 = require('/opt/s3');
const ws = require('/opt/ws');

const { DOMAIN_NAME, STAGE_NAME } = process.env;

exports.handler = async (event, context) => {
  const key = event.Records[0].s3.object.key;
  const size = event.Records[0].s3.object.size;

  // validate key
  let parts = key.split("/");
  if (parts.length != 2 || key.length != 65) {
    console.error(`Invalid session or file name. Deleting file ${key}.`);
    await s3.deleteObjectByKey(key);
    return { statusCode: 500, body: 'Internal server error' };
  }

  const [sessionId, fileId] = parts;

  // get session
  const session = (await sessions.getSessionDetails(sessionId)).Item;

  if (!session || new Date(session.expiry * 1000) < new Date()) {
    console.log(`File finished uploading after session expired. sessionId: ${sessionId}. Deleting file ${key}.`);
    await s3.deleteObjectByKey(key);
    return { statusCode: 500, body: 'Internal server error' };
  }

  if (size > session.maxSize) {
    console.error(`File uploaded that exceeded max file size ${size} > ${session.maxSize}. Deleting file ${key}.`);
    await s3.deleteObjectByKey(key);
    return { statusCode: 500, body: 'Internal server error' };
  }

  // Get filename and index from session
  let filename;
  let fileIndex;
  let type;

  let i = 0;
  for (fileObj of session.files) {
    if (fileObj.id == fileId) {
      fileIndex = i;
      filename = fileObj.filename;
      type = fileObj.type;
      if (fileObj.status != 'PENDING') {
        console.error(`Expected status for ${fileId} to be PENDING is actually ${fileObj.status}. Deleting file ${key}.`);
        await s3.deleteObjectByKey(key);
        // TODO send delete message to all clients
        return { statusCode: 500, body: 'Internal server error' };
      }
      break;
    }
    i++;
  }

  if (filename == undefined || !fileIndex == undefined) {
    console.error(`file not found in session filelist ${sessionId} fileId ${fileId}. Deleting file ${key}.`);
    await s3.deleteObjectByKey(key);
    return { statusCode: 500, body: 'Internal server error' };
  }

  // Update session file
  await sessions.updateFile(sessionId, fileIndex, fileId, filename, type, "UPLOADED", size);

  // Send messages to files
  const expiry = session.expiry - Math.floor(new Date().getTime() / 1000);
  const downloadUrl = s3.generateGetUrl(sessionId, fileId, expiry);

  let newFileMessagePromises = [];

  console.log(JSON.stringify(session.connections));

  for (connectionId of session.connections.values) {
    const messageBody = {
      type: "newFile",
      id: fileId,
      name: filename,
      fileType: type,
      url: downloadUrl,
      size: size
    };

    newFileMessagePromises.push(ws.send(DOMAIN_NAME, STAGE_NAME, connectionId, messageBody));
  }

  await Promise.all(newFileMessagePromises);

  return { statusCode: 200, body: 'Success' };
};