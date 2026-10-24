const net = require('net');

// Minimal SMTP sink for Nodemailer integration tests. It never relays mail.
async function startLocalSmtp() {
  const messages = [];
  const sockets = new Set();
  let rejectRecipient = false;
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let buffer = '';
    let data = null;
    socket.setEncoding('utf8');
    socket.write('220 local-test ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data !== null) {
          if (line === '.') {
            messages.push(data.join('\r\n'));
            data = null;
            socket.write('250 Message captured locally\r\n');
          } else data.push(line.replace(/^\.\./, '.'));
        } else if (/^DATA$/i.test(line)) {
          data = [];
          socket.write('354 End with a dot\r\n');
        } else if (/^QUIT$/i.test(line)) {
          socket.end('221 Bye\r\n');
        } else if (/^RCPT TO:/i.test(line) && rejectRecipient) {
          socket.write('550 Test recipient rejection\r\n');
        } else socket.write('250 OK\r\n');
      }
    });
    socket.on('error', () => {});
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    port: server.address().port,
    messages,
    rejectRecipients: (reject) => { rejectRecipient = reject; },
    close: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy();
      server.close(resolve);
    }),
  };
}

module.exports = { startLocalSmtp };
