const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost/fitness-trainer', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'message' || data.type === 'notification') {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });
});

const User = mongoose.model('User');
const Workout = mongoose.model('Workout');
const Task = mongoose.model('Task');

app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users.map(user => ({ email: user.email, role: user.role })));
});

app.post('/api/get-role', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  res.json({ role: user ? user.role : null });
});

app.post('/api/update-role', async (req, res) => {
  await User.findOneAndUpdate(
    { email: req.body.email },
    { email: req.body.email, role: req.body.role },
    { upsert: true }
  );
  res.sendStatus(200);
});

app.get('/api/workouts/:userId', async (req, res) => {
  const workouts = await Workout.find({ userId: req.body.userId });
  res.json(workouts);
});

server.listen(3000, () => console.log('Server running on port 3000'));