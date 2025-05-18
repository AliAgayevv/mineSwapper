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
