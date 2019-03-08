# Shyft

A tool to make moving files simpler

## WebSocket Protocol (v0)

MessageName (Identifier) (Permission: Host/Secondary) (Source: Server/Client)

All messages start with a single byte to represent the message type. They are then followed by the message contents. Generally if there is a response then the identifier byte will be the same. The client generally sends lowercase bytes and the server generally sends uppercase bytes.

To support clients without websockets there are plans to create a separate http protocol.

### Formats

* int [4] - 4 Byte integer.
* long [8] - 8 Byte integer. Usually used to represent datetimes.
* byte [1] - A single byte.
* binary [x] - a binary array *x* bytes long.
* string [x] - The string will start with a 4 byte integer describing the length of the string in bytes followed by the bytes of the string. All strings are in UTF-8.

### Messages

#### Create New Session (n) (Host) (Client)

```
    byte [1]     message type
```

#### New Session Created (N) (Host) (Server)

```
    byte [1]     message type
    binary [16]  SessionId
    binary [16]  HostKey
    long [8]     expiry datetime, epoch
    int [4]      max number of files
    int [4]      max file size in bytes
```

#### Reconnect (r) (Host) (Client)

Sent when host reconnects to a session.

```
    byte [1]     message type
    binary [16]  SessionId
    binary [16]  HostKey
```

#### Connect (c) (Secondary) (Client)

Sent when a new secondary connects.

```
    byte [1]     message type
    binary [16]  SessionId
```

#### Session has ended (X) (Host/Secondary) (Client)

Sent in response to connect or reconnect if the session has already ended.

```
    byte [1]     message type
```

#### Session data (C) (Host/Secondary) ()

Sent in response to reconnect or connect.

```
    byte [1]     message type
    long [8]     expiry datetime, epoch
    int [4]      max number of files
    int [4]      max file size in bytes
    int [4]      number of files
  For each file
    binary[16]   fileId
    string [x]   filename
    int [4]      size in bytes
```

#### New File (u) (Host/Secondary) (Server)

Sent for each new file uploaded to all clients. Even the client who uploaded the file.

```
    byte [1]     message type
    binary[16]   fileId
    string [x]   filename
    int [4]      size in bytes
```

#### Extend Session (e) (Host) (Client)

Will extend session by expected.

```
    byte [1]     message type
```

#### Session Extended (E) (Host/Secondary) (Server)

Sent to all clients (including host).

```
    byte [1]     message type
    long [8]     expiry datetime, epoch
```

#### Ping (p) (Host/Secondary) (Client)

Sent from client to check connection is still okay. Should be sent every minute if other messages have been sent or received.

```
    byte [1]     message type
```

#### Pong (P) (Host/Secondary) (Server)

Sent from the server in response.

```
    byte [1]     message type
```

#### Delete File (d) (Host) (Client)

Not needed for initial implementation

### File Deleted (D) (Host/Secondary) (Server)

Not needed for initial implementation


## HTTP Protocol

To make upload and download progress bars simpler uploading and downloading is done using simple http.

### Error response body

Each possible error is listed below with possible codes.

```
{
    "code": ""
}
```

### Upload File

POST /sessions/{sessionId}/files/

200 : on upload success

Response body:
```
{
    "fileId": "32 character hex string"
}
```
404 : if session cannot be found (notFound)
403 : Max number of files reach or file is too big (fileLimitReached) or (excessFileSize)

### Download File

GET /sessions/{sessionId}/files/{fileId}

200 : the raw file
404 : if session or file cannot be found

### Get Session

** Not Implemented in initial version**

### Get File List

** Not Implemented in initial version**

### Create New Session

** Not Implemented in initial version**

### Extend Session

** Not Implemented in initial version**


## String representation of binary ids

Convert the binary value to hex