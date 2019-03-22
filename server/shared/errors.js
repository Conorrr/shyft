// Unexpected error encounted
const UNEXPECTED = 'unexpected'

exports.codes = {
  UNEXPECTED: UNEXPECTED
}

exports.errorMessageBody = function(code) {
  return {
    type: "error",
    code: code
  }; 
}