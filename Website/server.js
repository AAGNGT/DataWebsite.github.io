const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true
    }
});
const path = require('path');

// 設置靜態文件服務
app.use(express.static(path.join(__dirname, 'user')));
app.use('/game', express.static(path.join(__dirname, 'user', 'game')));

// 添加路由
app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'user', 'game', 'game.html'));
});

// 啟動服務器
const PORT = 8080;  // 改為 8080 端口
http.listen(PORT, '0.0.0.0', () => {
    console.log(`服務器運行在 http://localhost:${PORT}`);
});

// 修改 Socket.IO 連接處理
io.on('connection', (socket) => {
    console.log('新用戶連接:', socket.id);

    // 創建遊戲房間
    socket.on('create-game', (data, callback) => {
        try {
            const roomId = generateRoomId();
            socket.join(roomId);
            
            // 初始化房間數據
            rooms.set(roomId, {
                id: roomId,
                players: [{
                    id: socket.id,
                    name: `玩家 ${socket.id.substr(0, 4)}`,
                    ready: false
                }],
                status: 'waiting'
            });

            callback({ success: true, roomId });
            
            // 廣播玩家列表更新
            io.to(roomId).emit('player-joined', {
                players: rooms.get(roomId).players
            });
            
        } catch (error) {
            console.error('創建房間錯誤:', error);
            callback({ success: false, error: '創建房間失敗' });
        }
    });

    // 加入遊戲房間
    socket.on('join-game', ({ roomId }, callback) => {
        try {
            const room = rooms.get(roomId);
            if (!room) {
                callback({ success: false, error: '房間不存在' });
                return;
            }

            socket.join(roomId);
            
            // 添加新玩家
            room.players.push({
                id: socket.id,
                name: `玩家 ${socket.id.substr(0, 4)}`,
                ready: false
            });

            callback({ success: true });
            
            // 廣播玩家列表更新
            io.to(roomId).emit('player-joined', {
                players: room.players
            });
            
        } catch (error) {
            console.error('加入房間錯誤:', error);
            callback({ success: false, error: '加入房間失敗' });
        }
    });

    // 玩家準備狀態更新
    socket.on('player-ready', ({ roomId, ready }) => {
        const room = rooms.get(roomId);
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.ready = ready;
                io.to(roomId).emit('player-joined', {
                    players: room.players
                });

                // 檢查是否所有玩家都準備好了
                const allReady = room.players.every(p => p.ready);
                if (allReady && room.players.length >= 2) {
                    room.status = 'starting';
                    io.to(roomId).emit('game-start', {
                        countdown: 3
                    });
                }
            }
        }
    });

    // ... 其他現有的 socket 事件處理 ...
});

// 生成房間 ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
} 