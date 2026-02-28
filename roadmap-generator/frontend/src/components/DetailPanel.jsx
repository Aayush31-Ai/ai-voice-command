export default function DetailPanel({ node, onClose }) {
  if (!node) return null;

  const { type, data } = node;

  const renderContent = () => {
    switch (type) {
      case 'goalNode':
        return (
          <>
            <h2 className="dp-title">{data.label}</h2>
            {data.estimated_duration && (
              <p className="dp-meta">
                Estimated Duration: <strong>{data.estimated_duration}</strong>
              </p>
            )}
            {data.next_actions?.length > 0 && (
              <div className="dp-section">
                <h3 className="dp-section-title">Next Actions</h3>
                <ul className="dp-list">
                  {data.next_actions.map((a, i) => (
                    <li key={i} className="dp-list-item dp-list-action">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        );

      case 'phaseNode':
        return (
          <>
            <div className="dp-badge dp-badge-phase">Phase {data.phaseIndex}</div>
            <h2 className="dp-title">{data.label}</h2>
            {data.duration && (
              <p className="dp-meta">
                Duration: <strong>{data.duration}</strong>
              </p>
            )}
          </>
        );

      case 'topicNode':
        return (
          <>
            <div className="dp-badge dp-badge-topic">Topic</div>
            <h2 className="dp-title">{data.label}</h2>
            <p className="dp-hint">
              Click the connected Phase node to see all topics and projects in that phase.
            </p>
          </>
        );

      case 'projectNode':
        return (
          <>
            <div className="dp-badge dp-badge-project">Project</div>
            <h2 className="dp-title">{data.label}</h2>
            <p className="dp-hint">
              Hands-on project for the parent phase. Build it to solidify the phase's concepts.
            </p>
          </>
        );

      case 'milestoneNode':
        return (
          <>
            <div className="dp-badge dp-badge-milestone">Milestone {data.index}</div>
            <h2 className="dp-title">{data.label}</h2>
            <p className="dp-hint">
              Reach this milestone to mark a major checkpoint in your learning journey.
            </p>
          </>
        );

      default:
        return <p className="dp-hint">{JSON.stringify(data)}</p>;
    }
  };

  return (
    <div className="detail-panel">
      <button className="dp-close" onClick={onClose} aria-label="Close panel">
        ✕
      </button>
      {renderContent()}
    </div>
  );
}
