var once = require('once')
var dwEOS = require('@dwcore/eos')
var fs = require('fs')

var noop = function () {}
var oldDep = /^v?\.0/.test(process.version)

var isNodeFn = function (fn) {
  return typeof fn === 'function'
}

var isNodeFS = function (stream) {
  if (!oldDep) return false
  if (!fs) return false
  return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isNodeFn(stream.close)
}

var isDwStreamRequest = function (stream) {
  return stream.setHeader && isNodeFn(stream.abort)
}

var dwStreamKiller = function (stream, reading, writing, callback) {
  callback = once(callback)

  var closed = false
  stream.on('close', function () {
    closed = true
  })

  dwEOS(stream, {readable: reading, writable: writing}, function (err) {
    if (err) return callback(err)
    closed = true
    callback()
  })

  var destroyed = false
  return function (err) {
    if (closed) return
    if (destroyed) return
    destroyed = true

    if (isNodeFS(stream)) return stream.close(noop)
    if (isDwStreamRequest(stream)) return stream.abort()

    if (isNodeFn(stream.destroy)) return stream.destroy()

    callback(err || new Error('dWeb Stream Was Destroyed.'))
  }
}

var call = function (fn) {
  fn()
}

var channel = function (from, to) {
  return from.pipe(to)
}

var dwChannel = function () {
  var dwstreams = Array.prototype.slice.call(arguments)
  var callback = isNodeFn(dwstreams[dwstreams.length - 1] || noop) && dwstreams.pop() || noop

  if (Array.isArray(dwstreams[0])) dwstreams = dwstreams[0]
  if (dwstreams.length < 2) throw new Error('dwChannel requires two dwstreams per minimum')

  var error
  var destroys = dwstreams.map(function (stream, i) {
    var reading = i < dwstreams.length - 1
    var writing = i > 0
    return dwStreamKiller(stream, reading, writing, function (err) {
      if (!error) error = err
      if (err) destroys.forEach(call)
      if (reading) return
      destroys.forEach(call)
      callback(error)
    })
  })

  return dwstreams.reduce(channel)
}

module.exports = dwChannel
