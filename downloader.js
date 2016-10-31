const net = require('net')
const fs = require('fs')
const crypto = require('crypto')
const DC = require('discovery-channel')
const msgpack = require('msgpack5-stream')

const id = process.argv[2]
const chunk = process.argv[3]

if (!id || !chunk) {
  console.log('Usage: node client.js [id] [chunk]')
  process.exit(1)
}

const channel = DC()
channel.join(id)

channel.once('peer', (peerId, peer, type) => {
  console.log('found a new peer', peer, type)
  const socket = net.connect(peer.port, peer.host)
  const protocol = msgpack(socket)

  protocol.once('data', (msg) => {
    const hashes = msg.hashes
    if (!hashValidate(hashes.join('\n'), id)) {
      throw new Error('invalid hashes')
    }

    protocol.on('data', msg => {
      if (!hashValidate(msg.data, hashes[msg.chunk])) {
        throw new Error('invalid chunk hash')
      }
      console.log(msg)
    })
  })

  console.log('Fetching chunk %d from %s...', chunk, id)
  protocol.write({type: 'request', chunk: chunk})
})

const hashValidate = (value, expected) => {
  var hashed = crypto.createHash('sha256')
    .update(value)
    .digest()
    .toString('hex')
  return hashed === expected
}
