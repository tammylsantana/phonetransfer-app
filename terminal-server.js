const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const os = require('os');

const PORT = 3456;
const wss = new WebSocketServer({ port: PORT });

console.log(`\n🖥  Terminal server running on ws://localhost:${PORT}`);
console.log(`📱 Open your admin page and the terminal will connect automatically.\n`);

wss.on('connection', (ws) => {
    console.log('✅ Browser terminal connected');

    const shell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/zsh';
    const cwd = __dirname; // project root

    const proc = spawn(shell, [], {
        cwd,
        env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
        cols: 120,
        rows: 30
    });

    proc.stdout.on('data', (data) => {
        ws.send(data.toString());
    });

    proc.stderr.on('data', (data) => {
        ws.send(data.toString());
    });

    ws.on('message', (msg) => {
        proc.stdin.write(msg.toString());
    });

    ws.on('close', () => {
        console.log('❌ Browser terminal disconnected');
        proc.kill();
    });

    proc.on('exit', () => {
        ws.close();
    });

    // Send welcome message
    ws.send('\r\n\x1b[1;36m📱 PhoneTransfer Terminal\x1b[0m\r\n');
    ws.send('\x1b[90mConnected to project directory. Try:\x1b[0m\r\n');
    ws.send('\x1b[33m  npx expo start\x1b[0m\r\n\r\n');
});
