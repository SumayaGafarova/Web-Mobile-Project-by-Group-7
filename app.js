document.addEventListener("DOMContentLoaded", () => {
  const baseProfileForm = document.getElementById("baseProfileForm");
  const addProfileButton = document.getElementById("addProfileButton");
  const profileNameInput = document.getElementById("profileNameInput");
  const profileButtonsContainer = document.getElementById("profileButtons");
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");
  const profileForm = document.getElementById("profileForm");

  let baseProfile = {
    education: [],
    experience: [],
    skills: [],
    certificates: [],
  };
  let profiles = {};

  const getDynamicFieldValues = (fieldClass) => {
    return Array.from(document.querySelectorAll(`.${fieldClass}`)).map(
      (input) => input.value
    );
  };

  // Save Base Profile Data
  baseProfileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    // Save all input data into the baseProfile object
    baseProfile = {
      name: document.getElementById("baseName").value,
      surname: document.getElementById("baseSurname").value,
      gender: document.getElementById("baseGender").value,
      age: document.getElementById("baseAge").value,
      birthDate: document.getElementById("baseBirthDate").value,
      education: getDynamicFieldValues("education-input"),
      experience: getDynamicFieldValues("experience-input"),
      skills: getDynamicFieldValues("skills-input"),
      certificates: document.getElementById("baseCertificates").files,
    };

    alert("Base Profile Saved!");
  });
  // NEED TO BE FIXED
  // ADD "+" buttons dynamically for education, experience, and skills
  //   const addDynamicFields = (fieldId, fieldClass, containerId) => {
  //     const container = document.getElementById(containerId);
  //     const newInput = document.createElement("input");
  //     newInput.type = "text";
  //     newInput.placeholder = `Enter additional ${fieldId}`;
  //     newInput.classList.add(fieldClass);
  //     container.appendChild(newInput);
  //   };

  // NEED TO BE FIXED
  // ADD "+" buttons for education, experience, and skills
  //   const createAddButton = (containerId, fieldClass) => {
  //     const container = document.getElementById(containerId);
  //     const addButton = document.createElement("button");
  //     addButton.textContent = "+";
  //     addButton.type = "button";
  //     addButton.addEventListener("click", () =>
  //       addDynamicFields(containerId, fieldClass, containerId)
  //     );
  //     container.appendChild(addButton);
  //   };

  //   createAddButton("educationContainer", "education-input");
  //   createAddButton("experienceContainer", "experience-input");
  //   createAddButton("skillsContainer", "skills-input");

  // Add Profile Button
  addProfileButton.addEventListener("click", () => {
    const profileName = profileNameInput.value.trim();
    if (!profileName) {
      alert("Please enter a profile name.");
      return;
    }

    profiles[profileName] = { ...baseProfile }; // Copy base profile data

    // Create a new profile button
    const profileButton = document.createElement("button");
    profileButton.textContent = profileName;
    profileButton.classList.add("profile-button");

    // Open Modal with Prefilled Data
    profileButton.addEventListener("click", () => {
      const profile = profiles[profileName];

      document.getElementById("profileName").value = profile.name || "";
      document.getElementById("profileSurname").value = profile.surname || "";
      document.getElementById("profileGender").value = profile.gender || "Male";
      document.getElementById("profileAge").value = profile.age || "";
      document.getElementById("profileBirthDate").value =
        profile.birthDate || "";

      // Populate dynamic fields for education, experience, skills
      populateDynamicFields("profileEducationContainer", profile.education);
      populateDynamicFields("profileExperienceContainer", profile.experience);
      populateDynamicFields("profileSkillsContainer", profile.skills);

      modal.style.display = "flex";
    });

    profileButtonsContainer.appendChild(profileButton);
    profileNameInput.value = "";
  });

  // Populate dynamic fields (education, experience, skills) in modal
  const populateDynamicFields = (containerId, values) => {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear existing fields
    values.forEach((value) => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = value;
      input.classList.add(`${containerId}-input`);
      container.appendChild(input);
    });
  };

  // Close Modal
  closeModal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Handle Profile Form Save
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Profile Saved!");
    modal.style.display = "none";
  });
});
