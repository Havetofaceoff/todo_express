const API_URL = "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Server request failed");
  }

  return data;
}

function getAllTasksApi() {
  return request("/tasks");
}

function getCategoriesApi() {
  return request("/categories");
}

function createTaskApi(task) {
  return request("/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

function updateTaskApi(id, task) {
  return request(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(task),
  });
}

function completeTaskApi(id, isCompleted) {
  return request(`/tasks/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ is_completed: isCompleted ? 1 : 0 }),
  });
}

function deleteTaskApi(id) {
  return request(`/tasks/${id}`, {
    method: "DELETE",
  });
}
