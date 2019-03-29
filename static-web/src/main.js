var WebSocketHandler = require('./WebSocketHandler');

let webSocketUrl = "wss://8yz0qkkqra.execute-api.eu-central-1.amazonaws.com/Prod";
let host = "http://localhost:8080/";

let state = "NOT_CONNECTED"; // CONNECTING / RECONNECTING / EXPIRED / DISCONNECTED
let sessionId;
let isHost;
let hostKey;
let expiry;
let maxFiles;
let maxSize;
let files = [];
/**
 * {
 *    id: string
 *    name: string
 *    type: string
 *    size: numeric
 *    url: string
 *    origin: boolean
 *    putUrl: string
 *    fileRef: File
 *    status: READY/TOO_LARGE/WAITING/QUEUED/UPLOADING/UPLOADED/
 * }
 */
let expiryTimer;

let webSocketHandler = new WebSocketHandler();

webSocketHandler.addHandler("pong", () => { console.log("ponged") });

// newSessionCreated 
// sessionData
// presignedUrl
// newFile
// fileDeleted - not implemented serverside
// sessionEnded - not implemented serverside
// error - not implemented serverside

webSocketHandler.addHandler("newSessionCreated", (data) => {
  state = "CONNECTED";
  document.getElementById("uploadButton").disabled = false;
  ({ sessionId, hostKey, maxFiles, maxSize } = data);
  isHost = true;
  expiry = new Date(data.expiry);

  saveToLocalStorage();
  // generate QR Code

  startExpiryTimer();
  renderFileMessage();
});

webSocketHandler.addHandler("sessionData", (data) => {
  state = "CONNECTED";
  document.getElementById("uploadButton").disabled = false;
  expiry = new Date(data.expiry);
  maxFiles = data.maxFiles;
  maxSize = data.maxSize;
  data.files.forEach((file) => { addFile(file, 'READY') });
  renderFileMessage();

  saveToLocalStorage();
  // generate QR Code

  startExpiryTimer();
});

webSocketHandler.addHandler("newFile", (data) => {
  if (!getFileById(data.id)) {
    addFile({
      id: data.id,
      name: data.name,
      type: data.fileType,
      url: data.url,
      size: data.size
    }, 'READY');
    renderFileMessage();
  }
  // generate QR Code
});

webSocketHandler.addHandler("error", (data) => {
  console.error('Unexpected Error', data);
});

webSocketHandler.addHandler('presignedUrl', (data) => {
  for (tempId in data.presignedUrls) {
    let file = getFileById(tempId);
    let presignedUrlFile = data.presignedUrls[tempId];
    // update file object
    file.id = presignedUrlFile.id
    file.name = presignedUrlFile.name
    file.putUrl = presignedUrlFile.url

    // update dom to actual id
    document.getElementById(`file${tempId}`).id = `file${file.id}`;
    updateFileDom(file.id, file.name, file.type, file.size, 'UPLOADING', null);

    // start upload
    var req = new XMLHttpRequest();
    req.open("PUT", file.putUrl, true);
    req.onload = function (oEvent) {
      updateFileDom(file.id, file.name, file.type, file.size, 'UPLOADED', null);
    };
    req.onprogress = (evt) => {
      let progress = Math.floor((evt.loaded / file.size) * 100);
      console.log(progress);
      document.getElementById(`file${file.id}`).getElementsByClassName('progress')[0].innerText = `Uploading ${progress}%`;
    };
    req.setRequestHeader('Content-Type', file.type);
    req.setRequestHeader('Content-Disposition', `attachment; filename="${file.name}"`);

    var fr = new FileReader();
    fr.readAsArrayBuffer(file.fileRef);

    var selectedFiles = fileSelector.files;
    for (let i = 0; i < selectedFiles.length; i++) {
      if (selectedFiles[i].name == file.name) {
        req.send(selectedFiles[i]);
      }
    }
  }
});

webSocketHandler.addCloseHandler(() => {
  document.getElementById("uploadButton").disabled = true;
  reconnect();
  state = 'RECONNECTING';
});

function getFileById(id) {
  return files.find(file => {
    return file.id == id
  });
}

function saveToLocalStorage() {
  localStorage.setItem('sessionId', sessionId);
  localStorage.setItem('isHost', isHost);
  localStorage.setItem('expiry', expiry);
  localStorage.setItem('hostKey', hostKey);
}

function typeToReadableString(contentType) {
  if (!contentType) {
    return 'Unknown';
  }
  if (contentType.toLowerCase().startsWith('audio/')) {
    return 'Audio';
  }
  if (contentType.toLowerCase().startsWith('video/')) {
    return 'Video';
  }
  if (contentType.toLowerCase().startsWith('text/')) {
    return 'Text';
  }
  if (contentType.toLowerCase().startsWith('image/')) {
    return 'Image';
  }
  if (contentType.toLowerCase().startsWith('application/vnd.ms-powerpoint') ||
    contentType.toLowerCase().startsWith('application/vnd.oasis.opendocument.presentation') ||
    contentType.toLowerCase().startsWith('application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
    return 'Presentation';
  }
  if (contentType.toLowerCase().startsWith('application/msword') ||
    contentType.toLowerCase().startsWith('application/vnd.oasis.opendocument.text')) {
    return 'Document';
  }
  if (contentType.toLowerCase().startsWith('application/vnd.ms-excel') ||
    contentType.toLowerCase().startsWith('application/vnd.oasis.opendocument.spreadsheet')) {
    return 'Spreadsheet';
  }
  if (contentType.toLowerCase().startsWith('application/pdf')) {
    return 'PDF ';
  }
  console.log(`Unknown content type ${contentType}`);
  return 'Unknown';
}

function statusToReadableString(status) {
  switch (status) {
    case 'READY': return 'Ready';
    case 'UPLOADING': return 'Uploading 0%';
    case 'WAITING': return 'Waiting';
    case 'QUEUED': return 'Queued';
    case 'TOO_LARGE': return 'File is greater than ' + sizeToReadableString(maxSize);
    case 'UPLOADED': return 'Uploaded';
  }
  console.log(`Unknown status ${status}`)
  return "Unknown";
}

function sizeToReadableString(bytes) {
  if (bytes == 0) return '0 Bytes';
  var k = 1024,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function addFile(file, status) {
  let { id, name, url, type, size, origin, putUrl, fileRef } = file;
  if (!origin) {
    origin = false;
  }

  files.push({ id, name, type, url, size, origin, putUrl, status, fileRef })

  // add new file line
  let newRow = document.getElementById('files').lastElementChild.cloneNode(true);
  newRow.id = `file${id}`
  document.getElementById('files').appendChild(newRow);
  updateFileDom(id, name, type, size, status, url);
  newRow.style.display = '';
}

function updateFileDom(id, name, type, size, status, url) {
  let readableType = typeToReadableString(type);
  let readableStatus = statusToReadableString(status);
  let readableSize = sizeToReadableString(size);
  let row = document.getElementById(`file${id}`);

  row.getElementsByClassName('filename')[0].innerText = name;
  row.getElementsByClassName('type')[0].innerText = readableType;
  row.getElementsByClassName('size')[0].innerText = readableSize;
  row.getElementsByClassName('progress')[0].innerText = readableStatus;
  if (url) {
    row.getElementsByClassName('save')[0].firstElementChild.href = url;
    row.getElementsByClassName('save')[0].style.visibility = 'visible';
  } else {
    row.getElementsByClassName('save')[0].style.visibility = 'hidden';
  }
}

function startExpiryTimer() {
  updateExpiry();
  if (expiryTimer) {
    clearInterval(expiryTimer);
  }
  expiryTimer = setInterval(updateExpiry, 1000);
  document.getElementById('expiry').style.visibility = 'visible';
}

function renderFileMessage() {
  let filesMessage = document.getElementById('filesMessage');
  if (files.length == 0) {
    filesMessage.style.display = '';
    filesMessage.innerText = "Nothing has been uploaded yet.";
  } else {
    document.getElementById('filesMessage').style.display = 'none';
  }
}

webSocketHandler.connect(webSocketUrl, (event) => {
  expiry = new Date(localStorage.getItem('expiry'));
  sessionId = localStorage.getItem('sessionId');
  hostKey = localStorage.getItem('hostKey');
  isHost = localStorage.getItem('isHost');
  reconnect();
  state = 'CONNECTING';
})

function reconnect() {
  if (expiry && sessionId && expiry > new Date()) {
    if (hostKey) {
      webSocketHandler.send({
        type: 'reconnect',
        sessionId: sessionId,
        hostKey: hostKey
      });
    } else {
      webSocketHandler.send({
        type: 'secondaryConnect',
        sessionId: sessionId,
        hostKey: hostKey
      });
    }
  } else {
    webSocketHandler.send({ type: 'newSession' });
  }
}

function updateExpiry() {
  let diff = expiry.getTime() - new Date().getTime();
  if (diff < 0) {
    diff = 0;
    document.getElementById('expiresMessage').innerText = 'Expired';
    document.getElementById('expiresTime').innerText = '';
    clearInterval(expiryTimer);
  } else {
    let diffMins = ("0" + Math.floor(diff / 60000)).slice(-2);
    let diffSecs = ("0" + Math.floor((diff / 1000) % 60)).slice(-2);
    document.getElementById('expiresTime').innerText = `${diffMins}:${diffSecs}`;
  }
}


/* Upload */
let fileSelector = document.getElementById("fileSelector");

document.getElementById("uploadButton").addEventListener('click', function (event) {
  fileSelector.click();
});

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
var rString = randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

let uploadTriggered = function () {
  var selectedFiles = fileSelector.files;
  if (selectedFiles.length == 0) {
    // do nothing
    return;
  } else {
    let uploadInitList = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      let file = selectedFiles[i];
      let tempId = Math.floor(Math.random() * 10000);
      // check file size
      if (file.size > maxSize) {
        addFile({ id: tempId, name: file.name, type: file.type, size: file.size }, 'TOO_LARGE');
        continue;
      }

      addFile({
        id: tempId,
        name: file.name,
        type: file.type,
        size: file.size,
        fileRef: file,
        origin: true
      }, 'WAITING');
      uploadInitList.push({
        tempId: tempId,
        filename: file.name,
        type: file.type,
      });
    }
    renderFileMessage();
    if (uploadInitList.length > 0) {
      webSocketHandler.send({
        type: 'uploadInit',
        files: uploadInitList
      });
    }

  }
}

fileSelector.addEventListener("change", uploadTriggered);