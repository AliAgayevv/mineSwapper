function initThemeToggle() {
  const body = document.getElementById("body");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");

  const savedTheme = localStorage.getItem("theme") || "dark";
  setTheme(savedTheme);

  themeToggle.addEventListener("click", () => {
    const currentTheme = body.classList.contains("light-theme")
      ? "light"
      : "dark";
    const newTheme = currentTheme === "light" ? "dark" : "light";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  });

  function setTheme(theme) {
    if (theme === "light") {
      body.classList.add("light-theme");
      themeIcon.src = "./images/darkMode.svg";
      themeIcon.alt = "Dark Mode";
    } else {
      body.classList.remove("light-theme");
      themeIcon.src = "./images/lightMode.svg";
      themeIcon.alt = "Light Mode";
    }
  }
}

// DOM yükləndikdən sonra funksiya çağır
document.addEventListener("DOMContentLoaded", initThemeToggle);
