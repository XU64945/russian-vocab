async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `请求失败：${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  login(username, password) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  me() {
    return request("/api/auth/me");
  },

  logout() {
    return request("/api/auth/logout", { method: "POST", body: "{}" });
  },

  bootstrap(bookId) {
    const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : "";
    return request(`/api/bootstrap${query}`);
  },

  saveProgress(bookId, progress) {
    return request("/api/progress", {
      method: "PUT",
      body: JSON.stringify({ bookId, progress }),
    });
  },

  getProgress(bookId) {
    return request(`/api/progress?bookId=${encodeURIComponent(bookId)}`);
  },

  changePassword(currentPassword, newPassword, confirmPassword) {
    return request("/api/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },

  listWordbooks() {
    return request("/api/wordbooks");
  },

  createWordbook(wordbook) {
    return request("/api/wordbooks", {
      method: "POST",
      body: JSON.stringify(wordbook),
    });
  },

  submitCorrection(correction) {
    return request("/api/corrections", {
      method: "POST",
      body: JSON.stringify(correction),
    });
  },

  listCorrections() {
    return request("/api/corrections");
  },

  resolveCorrection(id, status = "resolved") {
    return request(`/api/corrections/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  updateWord(bookId, wordId, word) {
    return request(
      `/api/wordbooks/${encodeURIComponent(bookId)}/words/${encodeURIComponent(wordId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(word),
      },
    );
  },
};
