// Get modal elements
const modal = document.getElementById("myModal");
const openModalBtn = document.getElementById("openModal");
const closeModalBtn = document.querySelector(".close");
const submitBtn = document.getElementById("submitBtn");

// Open modal
openModalBtn.onclick = function () {
    modal.style.display = "block";
}

// Close modal
closeModalBtn.onclick = function () {
    modal.style.display = "none";
}

// Close modal when clicking outside of the modal
window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// Submit form data and update the page
submitBtn.onclick = function () {
    const textInput = document.getElementById("textInput").value;
    const radioOption = document.querySelector('input[name="radioOption"]:checked');

    document.getElementById("outputText").textContent = `Text Input: ${textInput}`;
    document.getElementById("outputRadio").textContent = `Radio Option: ${radioOption ? radioOption.value : 'None'}`;

    modal.style.display = "none";
}
