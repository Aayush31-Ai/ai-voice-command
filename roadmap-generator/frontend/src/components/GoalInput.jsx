import { useState } from 'react';

export default function GoalInput({ onGenerate, loading }) {
  const [goal, setGoal] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (goal.trim()) onGenerate(goal.trim());
  };

  return (
    <form className="goal-form" onSubmit={handleSubmit}>
      <input
        className="goal-input"
        type="text"
        placeholder="e.g. Learn full-stack web development, Become a Machine Learning engineer..."
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        disabled={loading}
      />
      <button
        className="goal-btn"
        type="submit"
        disabled={loading || !goal.trim()}
      >
        {loading ? 'Generating...' : 'Generate Roadmap'}
      </button>
    </form>
  );
}
