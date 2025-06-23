const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  auth0Id: String,
  email: String,
  role: String,
  profile: {
    picture: String,
    weight: Number,
    notifications: Boolean
  }
});

const workoutSchema = new mongoose.Schema({
  userId: String,
  day: String,
  weekOffset: Number,
  exercises: [
    {
      name: String,
      reps: { type: [Number, String], default: 0 }, // Allow AMRAP
      weight: Number,
      sets: Number,
      audio: String // Base64 audio
    }
  ],
  rating: Number,
  notes: String
});

const taskSchema = new mongoose.Schema({
  clientId: String,
  task: String,
  createdAt: { type: Date, default: Date.now }
});

mongoose.model('User', userSchema);
mongoose.model('Workout', workoutSchema);
mongoose.model('Task', taskSchema);