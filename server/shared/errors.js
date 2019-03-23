exports.codes = {
  UNEXPECTED: 'unexpected',
  ENDED: 'ended'
}

exports.errorMessageBody = function(code) {
  return {
    type: "error",
    code: code
  }; 
}