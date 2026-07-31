document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");

  const userIconBtn = document.getElementById("user-icon-btn");
  const userDropdown = document.getElementById("user-dropdown");
  const authLoggedOut = document.getElementById("auth-logged-out");
  const authLoggedIn = document.getElementById("auth-logged-in");
  const loggedInLabel = document.getElementById("logged-in-label");
  const showLoginBtn = document.getElementById("show-login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");

  let isTeacher = false;
  let teacherUsername = null;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function setDropdownOpen(open) {
    userDropdown.classList.toggle("hidden", !open);
    userIconBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function openLoginModal() {
    setDropdownOpen(false);
    loginError.classList.add("hidden");
    loginForm.reset();
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
    document.getElementById("username").focus();
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
    loginError.classList.add("hidden");
    loginForm.reset();
  }

  function updateAuthUI() {
    if (isTeacher) {
      authLoggedOut.classList.add("hidden");
      authLoggedIn.classList.remove("hidden");
      loggedInLabel.textContent = `Signed in as ${teacherUsername}`;
      signupContainer.classList.remove("hidden");
    } else {
      authLoggedIn.classList.add("hidden");
      authLoggedOut.classList.remove("hidden");
      loggedInLabel.textContent = "";
      signupContainer.classList.add("hidden");
    }
  }

  async function checkAuthStatus() {
    try {
      const response = await fetch("/auth/status", { credentials: "same-origin" });
      const data = await response.json();
      isTeacher = Boolean(data.authenticated);
      teacherUsername = data.username || null;
      updateAuthUI();
      await fetchActivities();
    } catch (error) {
      console.error("Error checking auth status:", error);
      isTeacher = false;
      teacherUsername = null;
      updateAuthUI();
      await fetchActivities();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { credentials: "same-origin" });
      const activities = await response.json();

      // Clear loading message and select options (keep placeholder)
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteBtn = isTeacher
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" title="Unregister student">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteBtn}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (teachers only)
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userIconBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !userDropdown.classList.contains("hidden");
    setDropdownOpen(!isOpen);
  });

  showLoginBtn.addEventListener("click", () => {
    openLoginModal();
  });

  cancelLoginBtn.addEventListener("click", () => {
    closeLoginModal();
  });

  loginModal.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => closeLoginModal());
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.classList.add("hidden");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const params = new URLSearchParams({ username, password });
      const response = await fetch(`/auth/login?${params.toString()}`, {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json();

      if (response.ok) {
        isTeacher = true;
        teacherUsername = result.username;
        closeLoginModal();
        updateAuthUI();
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        loginError.textContent = result.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json();
      isTeacher = false;
      teacherUsername = null;
      setDropdownOpen(false);
      updateAuthUI();
      showMessage(result.message || "Logged out", "success");
      fetchActivities();
    } catch (error) {
      showMessage("Failed to log out. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  document.addEventListener("click", (event) => {
    if (
      !userDropdown.classList.contains("hidden") &&
      !userDropdown.contains(event.target) &&
      event.target !== userIconBtn
    ) {
      setDropdownOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!loginModal.classList.contains("hidden")) {
        closeLoginModal();
      }
      setDropdownOpen(false);
    }
  });

  // Initialize app
  checkAuthStatus();
});
