const fs = require('fs')
const net = require('net')
const crypto = require('crypto')
const hash = crypto.createHash('sha256')
const msgpack = require('msgpack5-stream')
const fsChunkStore = require('fs-chunk-store')
const DC = require('discovery-channel')

const filename = process.argv[2]

if (!filename) {
  console.log('Usage: node server.js [filename]')
  process.exit(1)
}

const channel = DC()
const CHUNK_SIZE = 1024
const FILE_LENGTH = fs.statSync(filename).size
const fileStore = fsChunkStore(CHUNK_SIZE, {path: filename, length: FILE_LENGTH})
const fileStream = fs.createReadStream(__filename)

fileStream.on('data', chunk => {
  hash.update(chunk)
})

fileStream.on('end', () => {
  const hashed = hash.digest()
  const server = net.createServer((socket) => {
    // const fileStream = fs.createReadStream(__filename)
    const protocol = msgpack(socket)
    protocol.on('data', msg => {
      console.log(msg)
      if (msg.type == 'request') {
        fileStore.get(msg.chunk, (err, buf) => {
          if (err) throw err
          protocol.write({type: 'response', chunk: msg.chunk, data: buf})
        })
      }
    })
  })

  server.listen(() => {
    const port = server.address().port
    channel.join(hashed.toString('hex'), port)
    console.log('server running on port', port)
    console.log(hashed.toString('hex'))
  })
})
