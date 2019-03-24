exports.codes = {
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