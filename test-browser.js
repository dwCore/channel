var stream = require('stream')
var dWebChannel = require('./index')

var dwReadStream = new stream.Readable()
var dwWriteStream = new stream.Writable()

dwReadStream._read = function (size) {
  this.push(Buffer(size).fill('abc'))
}

dwWriteStream._write = function (chunk, encoding, cb) {
  setTimeout(function () {
    cb()
  }, 100)
}

var dwStreamToHex = function () {
  var reverseDwStream = new (require('stream').Transform)()

  reverseDwStream._transform = function (chunk, enc, callback) {
    reverseDwStream.push(chunk.toString('hex'))
    callback()
  }

  return reverseDwStream
}

var dwWriteClosed = false
var dwReadClosed = false
var cbAnnounced = false

var check = function () {
  if (dwWriteClosed && dwReadClosed && cbAnnounced) {
    console.log('test-dbrowser.js passes')
    clearTimeout(timeout)
  }
}

dwWriteStream.on('finish', function () {
  dwWriteClosed = true
  check()
})

dwReadStream.on('end', function () {
  dwReadClosed = true
  check()
})

var res = dWebChannel(dwReadStream, dwStreamToHex(), dwStreamToHex(), dwStreamToHex(), dwWriteStream, function () {
  cbAnnounced = true
  check()
})

if (res !== dwWriteStream) {
  throw new Error('should return last dWeb stream.')
}

setTimeout(function () {
  dwReadStream.push(null)
  dwReadStream.emit('close')
}, 1000)

var timeout = setTimeout(function () {
  check()
  throw new Error('timeout')
}, 5000)
