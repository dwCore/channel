var dWebChannel = require('./index')

var dwReadStream = require('fs').createReadStream('/dev/random')
var dwWriteStream = require('fs').createWriteStream('/dev/null')

var dwStreamToHex = function () {
  var reverseDwStream = new (require('stream').Transform)()

  reverseDwStream._transform = function (chunk, enc, callback) {
    reverseDwStream.push(chunk.toString('hex'))
    callback()
  }

  return reverseDwStream
}

var dwWriteStreamClosed = false
var dwReadStreamClosed = false
var cbAnnounced = false

var check = function () {
  if (dwWriteStreamClosed && dwReadStreamClosed && cbAnnounced) {
    console.log('test-node.js passes')
    clearTimeout(timeout)
  }
}

dwWriteStream.on('close', function () {
  dwWriteStreamClosed = true
  check()
})

dwReadStream.on('close', function () {
  dwReadStreamClosed = true
  check()
})

var res = dWebChannel(dwReadStream, dwStreamToHex(), dwStreamToHex(), dwStreamToHex(), dwWriteStream, function () {
  cbAnnounced = true
  check()
})

if (res !== dwWriteStream) {
  throw new Error('should return last stream')
}

setTimeout(function () {
  dwReadStream.destroy()
}, 1000)

var timeout = setTimeout(function () {
  throw new Error('timeout')
}, 5000)
