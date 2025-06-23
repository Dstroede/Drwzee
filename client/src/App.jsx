import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const { loginWithRedirect, user, isAuthenticated } = useAuth0();
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      axios.post('http://localhost:3000/api/get-role', { email: user.email }).then(res => {
        setRole(res.data.role || null);
      });
    }
  }, [isAuthenticated, user]);

  const handleRoleSelection = async (selectedRole) => {
    await axios.post('http://localhost:3000/api/update-role', { email: user.email, role: selectedRole });
    setRole(selectedRole);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => loginWithRedirect()}
        >
          Log In with Auth0
        </button>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-2xl mb-4">Select Your Role</h1>
        <button
          className="px-4 py-2 mb-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => handleRoleSelection('client')}
        >
          Client
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => handleRoleSelection('coach')}
        >
          Coach
        </button>
      </div>
    );
  }

  return role === 'client' ? <ClientApp user={user} /> : <CoachApp user={user} />;
}

function ClientApp({ user }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMessages, setShowMessages] = useState(false);

  const ws = new WebSocket('ws://localhost:3000');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const workouts = days.map(day => ({
    day,
    hasWorkout: Math.random() > 0.5,
    exercises: [
      { name: 'Squats', reps: 12, weight: 135, sets: 3, audio: null },
      { name: 'Push-Ups', reps: 15, weight: 0, sets: 3, audio: null }
    ]
  }));

  useEffect(() => {
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'notification' && message.userId === user.sub) {
        alert(`New workout for ${message.day}!`);
        setSelectedDay(message.day);
        setWorkout(workouts.find(w => w.day === message.day));
        setCurrentExerciseIndex(0);
      } else if (message.type === 'message') {
        setMessages([...messages, message]);
      }
    };
    return () => ws.close();
  }, [messages, user.sub]);

  const handleStartWorkout = (day) => {
    setSelectedDay(day);
    setWorkout(workouts.find(w => w.day === day));
    setCurrentExerciseIndex(0);
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < workout.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleBackExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  const handleReportMore = (field, value) => {
    const updatedExercises = [...workout.exercises];
    updatedExercises[currentExerciseIndex][field] += value;
    setWorkout({ ...workout, exercises: updatedExercises });
  };

  const handleSubmitFeedback = async () => {
    await axios.post('http://localhost:3000/api/submit-workout-feedback', {
      userId: user.sub,
      day: selectedDay,
      rating,
      notes,
      exercises: workout.exercises
    });
    setCompleted(false);
    setSelectedDay(null);
    setWorkout(null);
  };

  const handleSendMessage = () => {
    ws.send(JSON.stringify({
      type: 'message',
      userId: user.sub,
      content: newMessage,
      recipient: 'coach'
    }));
    setNewMessage('');
  };

  const handleViewPastWeeks = () => {
    setWeekOffset(weekOffset - 1);
  };

  const handleProfileUpdate = async (updates) => {
    await axios.post('http://localhost:3000/api/update-profile', { userId: user.sub, ...updates });
  };

  if (showMessages) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 p-4 sm:max-w-md mx-auto">
        <h1 className="text-xl mb-4">Messages</h1>
        <div className="flex-1 overflow-y-auto bg-white p-2 rounded">
          {messages.map((msg, index) => (
            <div key={index} className={`p-2 ${msg.userId === user.sub ? 'text-right' : 'text-left'}`}>
              <p>{msg.content}</p>
            </div>
          ))}
        </div>
        <div className="flex mt-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded ml-2"
            onClick={handleSendMessage}
          >
            Send
          </button>
        </div>
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded mt-2"
          onClick={() => setShowMessages(false)}
        >
          Back to Workouts
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center h-screen bg-gray-100 p-4 sm:max-w-md mx-auto">
        <h1 className="text-xl mb-4">Workout Complete!</h1>
        <label className="mb-2">Rate Workout (1-5):</label>
        <input
          type="range"
          min="1"
          max="5"
          value={rating}
          onChange={(e) => setRating(parseInt(e.target.value))}
          className="w-full mb-4"
        />
        <textarea
          className="w-full p-2 border rounded mb-4"
          placeholder="Notes for your coach"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleSubmitFeedback}
        >
          Submit
        </button>
      </div>
    );
  }

  if (workout && selectedDay) {
    const exercise = workout.exercises[currentExerciseIndex];
    return (
      <div className="flex flex-col items-center h-screen bg-gray-100 p-4 sm:max-w-md mx-auto">
        <h1 className="text-xl mb-4">{exercise.name}</h1>
        {exercise.audio && (
          <audio controls className="mb-4">
            <source src={exercise.audio} type="audio/mpeg" />
          </audio>
        )}
        <div className="flex-1 bg-gray-200 w-full mb-4 flex items-center justify-center">
          <p>Start Position (Image/Video Placeholder)</p>
        </div>
        <p className="mb-2">Reps: {exercise.reps}</p>
        <p className="mb-4">Weight: {exercise.weight} lbs</p>
        <div className="flex space-x-2 mb-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => handleReportMore('reps', 1)}
          >
            + Reps
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => handleReportMore('weight', 5)}
          >
            + Weight
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded"
            onClick={handleBackExercise}
            disabled={currentExerciseIndex === 0}
          >
            Back
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleNextExercise}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4 sm:max-w-md mx-auto">
      <h1 className="text-xl mb-4">Your Workouts</h1>
      <div className="overflow-y-auto flex-1">
        {days.map(day => (
          <div
            key={day}
            className="p-2 mb-2 bg-white rounded shadow cursor-pointer"
            onClick={() => handleStartWorkout(day)}
          >
            {day} {workouts.find(w => w.day === day)?.hasWorkout ? '✅' : ''}
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleViewPastWeeks}
        >
          Past Weeks
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => handleProfileUpdate({})}
        >
          Profile
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => setShowMessages(true)}
        >
          Messages
        </button>
      </div>
    </div>
  );
}

function CoachApp({ user }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [view, setView] = useState('programming');
  const [workouts, setWorkouts] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [tasks, setTasks] = useState({});
  const clients = [
    { id: 1, name: 'Client 1' },
    { id: 2, name: 'Client 2' }
  ];

  const ws = new WebSocket('ws://localhost:3000');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'message' && message.recipient === user.sub) {
        setMessages([...messages, message]);
      }
    };
    return () => ws.close();
  }, [messages, user.sub]);

  const handleAddBlock = (clientId, day) => {
    const newBlock = {
      name: 'New Block',
      exercises: [],
      rounds: 1,
      collapsed: false
    };
    setWorkouts({
      ...workouts,
      [clientId]: {
        ...workouts[clientId],
        [day]: [...(workouts[clientId]?.[day] || []), newBlock]
      }
    });
  };

  const handleToggleBlock = (clientId, day, blockIndex) => {
    const updatedWorkouts = { ...workouts };
    updatedWorkouts[clientId][day][blockIndex].collapsed = !updatedWorkouts[clientId][day][blockIndex].collapsed;
    setWorkouts(updatedWorkouts);
  };

  const handleAddExercise = async (clientId, day, blockIndex, exercise) => {
    const updatedWorkouts = { ...workouts };
    updatedWorkouts[clientId][day][blockIndex].exercises.push({
      name: exercise.name,
      reps: exercise.reps || 'AMRAP',
      sets: exercise.sets,
      weight: exercise.weight,
      audio: exercise.audio
    });
    setWorkouts(updatedWorkouts);
    await axios.post('http://localhost:3000/api/save-workout', { clientId, day, workouts: updatedWorkouts[clientId][day] });
    ws.send(JSON.stringify({
      type: 'notification',
      userId: clientId,
      day,
      content: `New workout assigned for ${day}`
    }));
  };

  const handleCopyWeek = async (clientId, fromWeek) => {
    await axios.post('http://localhost:3000/api/copy-week', { clientId, fromWeek });
  };

  const handleSendMessage = (clientId) => {
    ws.send(JSON.stringify({
      type: 'message',
      userId: user.sub,
      content: newMessage,
      recipient: clientId
    }));
    setNewMessage('');
  };

  const handleAddTask = async (clientId, task) => {
    setTasks({ ...tasks, [clientId]: [...(tasks[clientId] || []), task] });
    await axios.post('http://localhost:3000/api/add-task', { clientId, task });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/4 bg-white p-4 border-r">
        <h1 className="text-xl mb-4">Clients</h1>
        {clients.map(client => (
          <div
            key={client.id}
            className="p-2 mb-2 bg-gray-200 rounded cursor-pointer"
            onClick={() => setSelectedClient(client)}
          >
            {client.name}
          </div>
        ))}
        <div className="flex space-x-2 mt-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => setView('programming')}
          >
            Programming
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => setView('messaging')}
          >
            Messaging
          </button>
        </div>
      </div>
      {view === 'programming' && selectedClient ? (
        <div className="flex-1 p-4">
          <h1 className="text-xl mb-4">{selectedClient.name}'s Workouts</h1>
          <div className="flex space-x-2 mb-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => handleCopyWeek(selectedClient.id, 'last')}
            >
              Copy Last Week
            </button>
            <input
              type="text"
              placeholder="Add task/note"
              className="p-2 border rounded"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTask(selectedClient.id, e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="grid grid-cols-7 gap-4">
            {days.map(day => (
              <div key={day} className="border p-2">
                <h2 className="text-lg mb-2">{day}</h2>
                <button
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => handleAddBlock(selectedClient.id, day)}
                >
                  Add Block
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : view === 'messaging' && selectedClient ? (
        <div className="flex-1 p-4">
          <h1 className="text-xl mb-4">Messages with {selectedClient.name}</h1>
          <div className="flex-1 overflow-y-auto bg-white p-2 rounded">
            {messages.map((msg, index) => (
              <div key={index} className={`p-2 ${msg.userId === user.sub ? 'text-right' : 'text-left'}`}>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
          <div className="flex mt-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded ml-2"
              onClick={() => handleSendMessage(selectedClient.id)}
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4">
          <h1 className="text-xl mb-4">Select a Client</h1>
        </div>
      )}
    </div>
  );
}

export default App;