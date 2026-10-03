/**
 * FlockGuard API Service
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = '/api';

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function analyzeImage(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
  }

  return res.json();
}

export async function compareImages(previousFile, currentFile) {
  const formData = new FormData();
  formData.append('previous', previousFile);
  formData.append('current', currentFile);

  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
    throw new Error(err.detail || 'Comparison failed');
  }

  return res.json();
}

export async function createAlert(alertData) {
  const res = await fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData),
  });

  if (!res.ok) throw new Error('Failed to create alert');
  return res.json();
}

export async function getAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function updateAlert(alertId, status) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error('Failed to update alert');
  return res.json();
}

/**
 * Load a demo image from the public/demo folder as a File object.
 */
export async function loadDemoImage(filename) {
  const res = await fetch(`/demo/${filename}`);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}
