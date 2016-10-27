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

channel.once('peer', (id, peer, type) => {
  console.log('found a new peer', peer, type)
  const socket = net.connect(peer.port, peer.host)
  // const downloadedFilename = 'file-' + Date.now()
  // const writer = fs.createWriteStream(downloadedFilename)
  const protocol = msgpack(socket)

  protocol.on('data', function (msg) {
    // For now just output the message we got from the server
    console.log(msg)
  })

  console.log('Fetching chunk %d from %s...', chunk, id)
  protocol.write({type: 'request', chunk: chunk})
  // socket.pipe(process.stdout)
  // writer.on('finish', () => {
  //   channel.destroy()
  // })
})
