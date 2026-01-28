import http from 'http'
import fs from 'fs/promises'

const server = http.createServer(async(req, res) => {
  if (req.url === '/') {
    const html = await fs.readFile('index.html', 'utf8')
    res.writeHead(200, { 'Content-Type': 'text/html' }).end(html)
    return
  }
  if (req.url === '/save') {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString('utf8')
    await fs.writeFile('index.html', body, 'utf8')
    
    res.writeHead(200).end('Saved')
    return
  }
  
  res.writeHead(404).end('Not found')
})

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})