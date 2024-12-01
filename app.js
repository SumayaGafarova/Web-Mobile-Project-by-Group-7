document.addEventListener('DOMContentLoaded', () => {
  // Profile management
  const profileSelector = document.getElementById('profile-selector');
  let profiles = {};
  let activeProfile = 'Default';
  let jobApplications = [];

  // Helper function to ensure profile initialization
  const initializeProfile = (profileName, callback) => {
    chrome.storage.local.get(['profiles'], (result) => {
      profiles = result.profiles || {};
      if (!profiles[profileName]) {
        profiles[profileName] = { fields: [], mappings: {} };
        chrome.storage.local.set({ profiles }, callback);
      } else if (callback) {
        callback();
      }
    });
  };

  // Initialize active profile
  chrome.storage.local.get(['activeProfile'], (result) => {
    activeProfile = result.activeProfile || 'Default';
    initializeProfile(activeProfile, () => {
      chrome.storage.local.get(['profiles'], (result) => {
        profiles = result.profiles || {};
        ({ fields, mappings } = profiles[activeProfile]);
        renderFields();
        renderMappings();
        populateLinkedInFields();
        updateProfileSelector();
      });
    });
  });

  // Get references to DOM elements
  const fieldsList = document.getElementById('fields-list');
  const fieldForm = document.getElementById('field-form');
  const mappingForm = document.getElementById('mapping-form');
  const mappingList = document.getElementById('mapping-list');
  let fields = [];
  let mappings = {};

  // Render fields
  const renderFields = () => {
    fieldsList.innerHTML = '';
    if (!Array.isArray(fields)) {
      console.error('Fields is not an array:', fields);
      fields = []; // Fallback to an empty array
    }
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
        populateLinkedInFields();
      });

      listItem.appendChild(fieldText);
      listItem.appendChild(removeButton);
      fieldsList.appendChild(listItem);
    });
  };

  // Render mappings
  const renderMappings = () => {
    mappingList.innerHTML = '';
    Object.keys(mappings).forEach((linkedInField) => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <span>${linkedInField} → ${mappings[linkedInField]}</span>
        <button onclick="removeMapping('${linkedInField}')">Remove</button>
      `;
      mappingList.appendChild(listItem);
    });
  };

  // Save fields and mappings to the active profile
  const saveFields = () => {
    profiles[activeProfile] = { fields, mappings };
    chrome.storage.local.set({ profiles });
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
      populateLinkedInFields();
      fieldForm.reset();
    }
  });

  // Populate LinkedIn fields dropdown with custom fields
  const populateLinkedInFields = () => {
    const linkedInFieldSelect = document.getElementById('custom-field');
    linkedInFieldSelect.innerHTML = '';
    fields.forEach((field) => {
      const option = document.createElement('option');
      option.value = field.name;
      option.textContent = field.name;
      linkedInFieldSelect.appendChild(option);
    });
  };

  const populatePageFields = () => {
    const formFieldSelect = document.getElementById('form-field');

    chrome.runtime.sendMessage({ action: 'fetchPageFields' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        alert("Unable to fetch fields from the current page. Ensure the content script is running.");
        return;
      }

      const pageFields = response?.pageFields || [];
      formFieldSelect.innerHTML = '';

      pageFields.forEach((fieldName) => {
        const option = document.createElement('option');
        option.value = fieldName;
        option.textContent = fieldName;
        formFieldSelect.appendChild(option);
      });
    });
  };


  // Add a new mapping with updated functionality
  mappingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const linkedInField = document.getElementById('custom-field').value.trim();
    const formField = document.getElementById('form-field').value.trim();

    if (linkedInField && formField) {
      mappings[linkedInField] = formField;
      saveFields();
      renderMappings();
      mappingForm.reset();
    } else {
      alert('Both LinkedIn Field and Form Field are required.');
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
      profileSelector.appendChild(option);
    });
  };

  // Switch active profile
  profileSelector.addEventListener('change', (e) => {
    activeProfile = e.target.value;
    chrome.storage.local.set({ activeProfile });
    initializeProfile(activeProfile, () => {
      chrome.storage.local.get(['profiles'], (result) => {
        profiles = result.profiles || {};
        ({ fields, mappings } = profiles[activeProfile]);
        renderFields();
        renderMappings();
        populateLinkedInFields();
      });
    });
  });

  // Create a new profile
  document.getElementById('create-profile').addEventListener('click', () => {
    const newProfileName = prompt('Enter a name for the new profile:').trim();
    if (newProfileName && !profiles[newProfileName]) {
      initializeProfile(newProfileName, updateProfileSelector);
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
      chrome.storage.local.set({ profiles, activeProfile });
      ({ fields, mappings } = profiles[activeProfile]);
      updateProfileSelector();
      renderFields();
      renderMappings();
      populateLinkedInFields();
      alert('Profile deleted successfully.');
    }
  });

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
              populateLinkedInFields();
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

  // Autofill forms
  document.getElementById('autofill-forms').addEventListener('click', () => {
    chrome.storage.local.get(['profiles', 'activeProfile'], (result) => {
      const profiles = result.profiles || {};
      const activeProfile = result.activeProfile || 'Default';

      if (!profiles[activeProfile]) {
        alert('No active profile found.');
        return;
      }

      chrome.runtime.sendMessage({
        action: 'autofillForms',
        profileData: profiles[activeProfile],
      });
    });
  });

  // Initialize
  updateProfileSelector();
  renderFields();
  renderMappings();
  populateLinkedInFields();
  populatePageFields();
});
