# Shyft

A tool to make moving files simpler

## WebSocket Protocol (v0)

MessageName (Type) (Permission: Host/Secondary) (Source: Server/Client)

All messages are in json format and contain a field type which corresponds to each message below. Some messages have other fields.

To support clients without websockets there are plans to create a separate http protocol.

### Messages

#### Create New Session (newSession) (Host) (Client)

Creates a new session. Responded to with `newSessionCreated` or `error`.

No other fields.

#### New Session Created (newSessionCreated) (Host) (Server)

Success response to `newSession`.

| field       | type     | description                                                          |
|-------------|----------|----------------------------------------------------------------------|
| sessionId   | String   | Unique 32 character hex string. Identifies the new session           |
| hostKey     | String   | Unique 32 character hex string. Used by host to identify themselves. |
| expiry      | DateTime | When the session expires.                                            |
| maxFiles    | Number   | Maximum number of files allowed in this session.                     |
| maxSize     | Number   | Maximum size of any of the files allowed in this session in bytes.   |

#### Reconnect (reconnect) (Host) (Client)

Sent when host reconnects to a session.

| field       | type     | description                             |
|-------------|----------|-----------------------------------------|
| sessionId   | String   | Identifies the session to reconnect to. |
| hostKey     | String   | Used by host to identify themselves.    |

#### Connect (connect) (Secondary) (Client)

Sent when a new secondary connects.

| field       | type     | description                     |
|-------------|----------|---------------------------------|
| sessionId   | String   | Identifies the session to join. |

#### Session has ended (ended) (Host/Secondary) (Server)

Sent in response to connect or reconnect if the session has already ended.

No other fields.

#### Session data (sessionData) (Host/Secondary) (Server)

Sent in response to reconnect or connect.

| field       | type         | description                                                        |
|-------------|--------------|--------------------------------------------------------------------|
| expiry      | DateTime     | When the session expires.                                          |
| maxFiles    | Number       | Maximum number of files allowed in this session.                   |
| maxSize     | Number       | Maximum size of any of the files allowed in this session in bytes. |
| files       | List of file | List of files, already uploaded to this session.                   |

file:

| field | type     | description                      |
|-------|----------|----------------------------------|
| id    | String   | Globally unique id for the file. |
| name  | String   | Original name of the file.       |
| size  | Number   | Size of the file in bytes.       |

#### New File (newFile) (Host/Secondary) (Server)

Sent for each new file uploaded to all clients. Even the client who uploaded the file.

| field    | type     | description                   |
|----------|----------|-------------------------------|
| id    | String   | Globally unique id for the file. |
| name  | String   | Original name of the file.       |
| size  | Number   | Size of the file in bytes.       |

#### Extend Session (extendSession) (Host) (Client)

Will extend session by expected.

No other fields.

#### Session Extended (sessionExtended) (Host/Secondary) (Server)

Sent to all clients (including host).

| field    | type     | description                      |
|----------|----------|----------------------------------|
| expiry      | DateTime | When the session expires.     |

#### Ping (ping) (Host/Secondary) (Client)

Sent from client to check connection is still okay. Should be sent every minute if other messages have been sent or received.

No other fields.

#### Pong (pong) (Host/Secondary) (Server)

Sent from the server in response.

No other fields.

#### Delete File (deleteFile) (Host) (Client)

Not needed for initial implementation

#### File Deleted (fileDeleted) (Host/Secondary) (Server)

Not needed for initial implementation

#### Error (error) (Host/Secondary) (Server)

Sent when an error is encountered

| field       | type   | description                                    |
|-------------|--------|------------------------------------------------|
| code        | String | describes the type of problem. E.G. No session |

## HTTP Protocol

To make upload and download progress bars simpler uploading and downloading is done using simple http.

### Error response body

Each possible error is listed below with possible codes.

| code        | description                                    |
|-------------|------------------------------------------------|
| TODO        |                                                |

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

## Url Structure

shyft.to -> redirects to shyftto.com

`shyftto.com` - static html content
`ws.shyftto.com` - all websockets
`files.shyftto.com` - all file transfers

## Deploying Server

First Package server

```
sam package --output-template-file packaged.yaml --s3-bucket shyfttemplates
```

Next Deploy Changes

```
aws cloudformation deploy --template-file /home/conor/shyft/server/packaged.yaml --stack-name testshyft --capabilities CAPABILITY_IAM 
```