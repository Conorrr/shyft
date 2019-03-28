exports.codes = {
  BAD_AUTH        : 'host-key does not match this sessionId',
  ENDED           : 'ended',
  INVALID_REQUEST : 'invalid-request',
  NOT_CONNECTED   : 'not-connected',
  TOO_MANY_FILES  : 'too-many-files',
  UNEXPECTED      : 'unexpected'
}

exports.errorMessageBody = function(code) {
  return {
    type: "error",
    code: code
  }; 
}