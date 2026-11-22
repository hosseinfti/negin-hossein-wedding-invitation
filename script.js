const stage = document.querySelector(".invitation-stage");
const resetButton = document.querySelector(".reset-button");
const statusMessage = document.querySelector(".status-message");

let isOpen = false;
let resetTimer;

function openInvitation() {
  if (isOpen) return;
  window.clearTimeout(resetTimer);
  document.body.classList.remove("is-resetting");
  isOpen = true;
  document.body.classList.add("is-open");
  stage.setAttribute("aria-label", "Opened wedding invitation");
  statusMessage.textContent = "The vellum wrap and lace bow lifted away. The invitation is open.";
}

function wrapInvitation(event) {
  event.stopPropagation();
  if (!isOpen) return;
  isOpen = false;
  document.body.classList.add("is-resetting");
  document.body.classList.remove("is-open");
  stage.setAttribute("aria-label", "Wrapped wedding invitation. Tap or press Enter to open.");
  statusMessage.textContent = "The invitation is wrapped again.";
  stage.focus({ preventScroll: true });
  resetTimer = window.setTimeout(() => {
    document.body.classList.remove("is-resetting");
  }, 980);
}

stage.addEventListener("click", openInvitation);
stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openInvitation();
  }
});

resetButton.addEventListener("click", wrapInvitation);

document.addEventListener("click", (event) => {
  if (!isOpen && !resetButton.contains(event.target)) openInvitation();
});

