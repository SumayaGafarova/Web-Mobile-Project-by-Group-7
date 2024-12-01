document.addEventListener('DOMContentLoaded', () => {
  // Profile management
  const profileSelector = document.getElementById('profile-selector');
  let profiles = JSON.parse(localStorage.getItem('profiles')) || {};
  let activeProfile = localStorage.getItem('activeProfile') || 'Default';

  // Ensure active profile exists and is an array
  if (!profiles[activeProfile] || !Array.isArray(profiles[activeProfile])) {
    profiles[activeProfile] = [];
    localStorage.setItem('profiles', JSON.stringify(profiles));
  }

  // Get references to DOM elements
  const fieldsList = document.getElementById('fields-list');
  const fieldForm = document.getElementById('field-form');
  let fields = profiles[activeProfile]; // Safe initialization

  // Render fields
  const renderFields = () => {
    fieldsList.innerHTML = '';
    fields.forEach((field, index) => {
      const listItem = document.createElement('li');
      const fieldText = document.createElement('span');
      fieldText.textContent = `${field.name}: ${field.value}`;

      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        fields.splice(index, 1);
        saveFields();
        renderFields();
      });

      listItem.appendChild(fieldText);
      listItem.appendChild(removeButton);
      fieldsList.appendChild(listItem);
    });
  };

  // Save fields to the active profile
  const saveFields = () => {
    profiles[activeProfile] = fields;
    localStorage.setItem('profiles', JSON.stringify(profiles));
  };

  // Add a new field
  fieldForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fieldName = document.getElementById('field-name').value.trim();
    const fieldValue = document.getElementById('field-value').value.trim();

    if (fieldName && fieldValue) {
      const existingFieldIndex = fields.findIndex((field) => field.name === fieldName);
      if (existingFieldIndex !== -1) {
        fields[existingFieldIndex].value = fieldValue;
      } else {
        fields.push({ name: fieldName, value: fieldValue });
      }
      saveFields();
      renderFields();
      fieldForm.reset();
    }
  });

  // Populate the profile selector dropdown
  const updateProfileSelector = () => {
    profileSelector.innerHTML = '';
    Object.keys(profiles).forEach((profileName) => {
      const option = document.createElement('option');
      option.value = profileName;
      option.textContent = profileName;
      if (profileName === activeProfile) {
        option.selected = true;
      }
      if (profileName === "Default") {
        option.disabled = true;
      }
      profileSelector.appendChild(option);
    });
  };

  // Switch active profile
  profileSelector.addEventListener('change', (e) => {
    activeProfile = e.target.value;
    localStorage.setItem('activeProfile', activeProfile);

    // Ensure the new profile exists and is an array
    if (!profiles[activeProfile] || !Array.isArray(profiles[activeProfile])) {
      profiles[activeProfile] = [];
      localStorage.setItem('profiles', JSON.stringify(profiles));
    }

    fields = profiles[activeProfile];
    renderFields();
  });

  // Create a new profile
  document.getElementById('create-profile').addEventListener('click', () => {
    const newProfileName = prompt('Enter a name for the new profile:').trim();
    if (newProfileName && !profiles[newProfileName]) {
      profiles[newProfileName] = [];
      localStorage.setItem('profiles', JSON.stringify(profiles));
      updateProfileSelector();
      alert(`Profile "${newProfileName}" created successfully.`);
    } else if (profiles[newProfileName]) {
      alert(`Profile "${newProfileName}" already exists.`);
    } else {
      alert('Profile name cannot be empty.');
    }
  });

  // Delete the current profile
  document.getElementById('delete-profile').addEventListener('click', () => {
    if (Object.keys(profiles).length === 1) {
      alert('You must have at least one profile.');
      return;
    }
    if (confirm(`Are you sure you want to delete the profile "${activeProfile}"?`)) {
      delete profiles[activeProfile];
      activeProfile = Object.keys(profiles)[0];
      localStorage.setItem('profiles', JSON.stringify(profiles));
      localStorage.setItem('activeProfile', activeProfile);
      fields = profiles[activeProfile];
      updateProfileSelector();
      renderFields();
      alert('Profile deleted successfully.');
    }
  });

  // Initialize
  renderFields();
  updateProfileSelector();

  // Extract LinkedIn Section
  document.getElementById('extract-data').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: extractLinkedInData,
        },
        (result) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            alert("Unable to extract data. Ensure you're on your LinkedIn profile.");
          } else {
            const data = result[0].result;
            if (data) {
              Object.keys(data).forEach((key) => {
                const existingFieldIndex = fields.findIndex((field) => field.name === key);
                if (existingFieldIndex !== -1) {
                  fields[existingFieldIndex].value = data[key];
                } else {
                  fields.push({ name: key, value: data[key] });
                }
              });
              saveFields();
              renderFields();
              alert("Data extracted successfully!");
            }
          }
        }
      );
    } catch (error) {
      console.error(error);
      alert("An error occurred during extraction.");
    }
  });

  // Function injected into LinkedIn's page to scrape data
  function extractLinkedInData() {
    const profileData = {};
    const nameElement = document.querySelector('h1');
    if (nameElement) profileData['Full Name'] = nameElement.innerText;

    let positionElement = document.querySelector('.text-body-medium');
    if (!positionElement) positionElement = document.querySelector('.body-small.text-color-text');
    if (positionElement) profileData['Position'] = positionElement.innerText;

    const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words');
    if (locationElement) profileData['Location'] = locationElement.innerText;

    const summaryElement = document.querySelector('.pv-about__summary-text');
    if (summaryElement) profileData['Summary'] = summaryElement.innerText;

    return profileData;
  }
});
