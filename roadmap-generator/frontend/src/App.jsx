import { useState, useCallback } from 'react';
import GoalInput from './components/GoalInput.jsx';
import RoadmapFlow from './components/RoadmapFlow.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import { generateRoadmap, askFollowUp } from './api.js';

export default function App() {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [followUpQ, setFollowUpQ] = useState('');
  const [followUpA, setFollowUpA] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const handleGenerate = useCallback(async (goal) => {
    setLoading(true);
    setError(null);
    setRoadmap(null);
    setSelectedNode(null);
    setFollowUpA(null);
    setFollowUpQ('');

    try {
      const data = await generateRoadmap(goal);
      setRoadmap(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAskFollowUp = useCallback(async () => {
    if (!followUpQ.trim() || !roadmap) return;
    setFollowUpLoading(true);
    setFollowUpA(null);
    try {
      const result = await askFollowUp(followUpQ, roadmap);
      setFollowUpA(result.answer);
    } catch (err) {
      setFollowUpA(`Error: ${err.message}`);
    } finally {
      setFollowUpLoading(false);
    }
  }, [followUpQ, roadmap]);

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">Learning Roadmap Generator</h1>
        <p className="app-subtitle">
          Enter a skill or career goal — AI builds your personalized roadmap
        </p>
      </header>

      <GoalInput onGenerate={handleGenerate} loading={loading} />

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Generating your roadmap...</p>
        </div>
      )}

      {roadmap && !loading && (
        <div className="canvas-wrapper">
          <RoadmapFlow roadmap={roadmap} onNodeClick={setSelectedNode} />
          {selectedNode && (
            <DetailPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      )}

      {roadmap && !loading && (
        <div className="followup-section">
          <h3 className="followup-title">Ask a follow-up question</h3>
          <div className="followup-row">
            <input
              className="followup-input"
              type="text"
              placeholder="e.g. What resources should I use for Phase 1? Create a weekly plan."
              value={followUpQ}
              onChange={(e) => setFollowUpQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskFollowUp()}
            />
            <button
              className="followup-btn"
              onClick={handleAskFollowUp}
              disabled={followUpLoading || !followUpQ.trim()}
            >
              {followUpLoading ? 'Asking...' : 'Ask'}
            </button>
          </div>
          {followUpA && (
            <div className="followup-answer">{followUpA}</div>
          )}
        </div>
      )}
    </div>
  );
}
