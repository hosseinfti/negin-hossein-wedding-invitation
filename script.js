const stage = document.querySelector(".invitation-stage");
const resetButton = document.querySelector(".reset-button");
const statusMessage = document.querySelector(".status-message");

let isOpen = false;

function openInvitation() {
  if (isOpen) return;
  isOpen = true;
  document.body.classList.add("is-open");
  stage.setAttribute("aria-label", "Opened wedding invitation");
  statusMessage.textContent = "The vellum wrap and lace bow lifted away. The invitation is open.";
}

function wrapInvitation(event) {
  event.stopPropagation();
  isOpen = false;
  document.body.classList.remove("is-open");
  stage.setAttribute("aria-label", "Wrapped wedding invitation. Tap or press Enter to open.");
  statusMessage.textContent = "The invitation is wrapped again.";
  stage.focus({ preventScroll: true });
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

