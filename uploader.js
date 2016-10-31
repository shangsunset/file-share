const fs = require('fs')
const net = require('net')
const crypto = require('crypto')
const hasher = require('fixed-size-chunk-hashing')
const msgpack = require('msgpack5-stream')
const fsChunkStore = require('fs-chunk-store')
const DC = require('discovery-channel')

const filename = process.argv[2] || __filename

if (!filename) {
  console.log('Usage: node server.js [filename]')
  process.exit(1)
}

const channel = DC()
const CHUNK_SIZE = 1024
const FILE_LENGTH = fs.statSync(filename).size
const fileStream = fs.createReadStream(__filename)

fileStream.pipe(hasher(CHUNK_SIZE, (err, hashes) => {
  if (err) {
    throw err
  }
  const id = crypto.createHash('sha256')
    .update(hashes.join('\n'))
    .digest()
    .toString('hex')

  const server = net.createServer((socket) => {
    const protocol = msgpack(socket)
    protocol.on('data', msg => {
      console.log(msg)
      const fileStore = fsChunkStore(CHUNK_SIZE, {path: filename, length: FILE_LENGTH})
      if (msg.type === 'request') {
        fileStore.get(msg.chunk, (err, buf) => {
          if (err) throw err
          else {
            protocol.write({type: 'response', chunk: msg.chunk, data: buf})
          }
        })
      }
    })

    protocol.write({type: 'handshake', hashes: hashes})
  })

  server.listen(() => {
    const port = server.address().port
    channel.join(id, port)
    console.log('server running on port', port)
    console.log(id)
  })
}))

