var modalText = document.getElementById("modal-text");

// When the user clicks the button, open the modal 
function openModal(text = ""){
  document.getElementById("error-modal").style.display = "block";
  document.getElementById("modal-text").innerHTML = text;
}



// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == document.getElementById("error-modal")) {
    document.getElementById("error-modal").style.display = "none";
  }
}
if (typeof(module) !== "undefined") {
    module.exports.openModal = openModal
}
