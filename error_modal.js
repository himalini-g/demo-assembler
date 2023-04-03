var modal = document.getElementById("error-modal");

// Get the button that opens the modal
var modalButton = document.getElementById("hidden-modal-button");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];
var modalText = document.getElementById("modal-text");

// When the user clicks the button, open the modal 
function openModal(text = ""){
  modal.style.display = "block";
  modalText.innerHTML = text;
}
// modalButton.onclick = function(e, text=`yoooo`) {
//   modal.style.display = "block";
//   modalText.innerHTML = text;
// }

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
if (typeof(module) !== "undefined") {
    module.exports.openModal = openModal
}
