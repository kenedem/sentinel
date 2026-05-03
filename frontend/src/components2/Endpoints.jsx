import { useState } from "react";

export default function Endpoints({ endpoints, onAdd, onDelete }) {
  const [form, setForm] = useState({ name: "", url: "", timeout: 5000 });
  const [adding, setAdding] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.url) return alert("Name and URL are required");
    await onAdd(form);
    setForm({ name: "", url: "", timeout: 5000 });
    setAdding(false);
  };

  return (
    <div className="endpoints-page">
      <div className="endpoints-header">
        <h2>⚙️ Monitored Endpoints ({endpoints.length})</h2>
        <button className="btn-add" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "+ Add Endpoint"}
        </button>
      </div>

      {adding && (
        <div className="add-form">
          <h3>Add New Endpoint</h3>
          <div className="form-row">
            <input
              placeholder="Service Name (e.g. My API)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="URL (e.g. https://myapi.com)"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <input
              type="number"
              placeholder="Timeout (ms)"
              value={form.timeout}
              onChange={(e) => setForm({ ...form, timeout: parseInt(e.target.value) })}
            />
            <button className="btn-save" onClick={handleSubmit}>
              Save
            </button>
          </div>
        </div>
      )}

      <div className="endpoints-list">
        {endpoints.map((ep) => (
          <div key={ep.id} className="endpoint-row">
            <div className="ep-info">
              <strong>{ep.name}</strong>
              <span className="ep-url">{ep.url}</span>
            </div>
            <div className="ep-meta">
              <span>Timeout: {ep.timeout}ms</span>
              <span>Interval: {ep.interval / 1000}s</span>
              <span className={`ep-status ${ep.status}`}>
                {ep.status?.toUpperCase() || "UNKNOWN"}
              </span>
            </div>
            <button className="btn-delete" onClick={() => onDelete(ep.id)}>
              🗑 Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}