const modal = document.getElementById("howToPlayModal");
const howToPlayBtn = document.getElementById("howToPlay");
const closeBtn = document.getElementsByClassName("close-button")[0];

howToPlayBtn.onclick = function () {
  modal.style.display = "block";
};

closeBtn.onclick = function () {
  modal.style.display = "none";
};

// Reactdaki outside click hooku kimidir
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

const tutorialDropdownOpenText = document.getElementById(
  "tutorialDropdownOpenText"
);
const tutorialDropdown = document.getElementById("tutorialDropdown");
const icon = document.getElementById("icon");

tutorialDropdownOpenText.addEventListener("click", function (event) {
  event.stopPropagation();
  tutorialDropdown.style.display === "block"
    ? (tutorialDropdown.style.display = "none")
    : (tutorialDropdown.style.display = "block");
  icon.style.transform =
    tutorialDropdown.style.display === "block"
      ? "rotate(180deg)"
      : "rotate(0deg)";
});
