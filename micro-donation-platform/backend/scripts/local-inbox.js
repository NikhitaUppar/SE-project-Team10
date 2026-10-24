const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const express = require('express');
const path = require('path');
const crypto = require('crypto');

// Development-only mail sink. It accepts SMTP but never forwards messages.
async function startLocalInbox({ smtpPort = 1025, webPort = 8025 } = {}) {
  const messages = [];
  const smtp = new SMTPServer({
    name: 'localhost',
    disabledCommands: ['AUTH', 'STARTTLS'],
    authOptional: true,
    disableReverseLookup: true,
    size: 5 * 1024 * 1024,
    maxClients: 10,
    closeTimeout: 1000,
    onData(stream, session, callback) {
      const chunks = [];
      let size = 0;
      stream.on('data', chunk => {
        size += chunk.length;
        if (size <= 5 * 1024 * 1024) chunks.push(chunk);
      });
      stream.on('error', callback);
      stream.on('end', async () => {
        if (stream.sizeExceeded || size > 5 * 1024 * 1024) {
          return callback(Object.assign(new Error('Message exceeds 5 MB'), { responseCode: 552 }));
        }
        try {
          const mail = await simpleParser(Buffer.concat(chunks));
          messages.unshift({
            id: crypto.randomUUID(),
            receivedAt: new Date().toISOString(),
            to: session.envelope.rcptTo.map(recipient => recipient.address).join(', '),
            from: mail.from?.text || '',
            subject: mail.subject || '(No subject)',
            text: mail.text || '',
          });
          messages.length = Math.min(messages.length, 100);
          callback();
        } catch {
          callback(new Error('Unable to read local email'));
        }
      });
    },
  });
  const app = express();
  app.use((req, res, next) => {
    // Keep the development inbox on this machine and reject DNS rebinding.
    if (!['localhost', '127.0.0.1'].includes(req.hostname)) return res.sendStatus(403);
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.get('/api/messages', (req, res) => res.json(messages));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'local-inbox.html')));
  const listen = (server, port) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  await listen(smtp, smtpPort);
  const web = require('http').createServer(app);
  try {
    await listen(web, webPort);
  } catch (error) {
    await new Promise(resolve => smtp.close(resolve));
    throw error;
  }
  return {
    smtpPort: smtp.server.address().port,
    webPort: web.address().port,
    close: () => Promise.all([
      new Promise(resolve => smtp.close(resolve)),
      new Promise(resolve => web.close(resolve)),
    ]),
  };
}

if (require.main === module) {
  startLocalInbox().then(inbox => {
    console.log(`Local email inbox: http://localhost:${inbox.webPort}`);
    console.log(`SMTP: 127.0.0.1:${inbox.smtpPort}. Messages stay in memory until restart.`);
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => inbox.close().then(() => process.exit(0)));
    }
  }).catch(error => {
    console.error('Cannot start local inbox:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { startLocalInbox };
