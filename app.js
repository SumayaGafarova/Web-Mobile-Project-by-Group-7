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

  const deleteJobApplication = (index) => {
    chrome.storage.local.get(['jobApplications'], (result) => {
      const jobApplications = result.jobApplications || [];

      // Remove the job application at the specified index
      jobApplications.splice(index, 1);

      // Save and re-render after deletion
      chrome.storage.local.set({ jobApplications }, () => {
        renderJobDashboard();
      });
    });
  };

  const editJobApplication = (index) => {
    chrome.storage.local.get(['jobApplications'], (result) => {
      const jobApplications = result.jobApplications || [];
      const application = jobApplications[index];

      // Populate the form with existing values
      document.getElementById('company-name').value = application.company;
      document.getElementById('job-title').value = application.title;
      document.getElementById('application-date').value = application.date;
      document.getElementById('application-status').value = application.status;

      // Listen for form submission
      const jobForm = document.getElementById('job-form');
      jobForm.onsubmit = (e) => {
        e.preventDefault();

        // Get updated values
        const updatedApplication = {
          company: document.getElementById('company-name').value.trim(),
          title: document.getElementById('job-title').value.trim(),
          date: document.getElementById('application-date').value,
          status: document.getElementById('application-status').value,
        };

        // Replace the old application with the updated one
        jobApplications[index] = updatedApplication;

        // Save to storage and re-render the dashboard
        chrome.storage.local.set({ jobApplications }, () => {
          renderJobDashboard();
          jobForm.reset();
          jobForm.onsubmit = null; // Reset the form's onsubmit handler
        });
      };
    });
  };

  const renderJobDashboard = () => {
    chrome.storage.local.get(['jobApplications'], (result) => {
      const jobApplications = result.jobApplications || [];
      const jobTableBody = document.querySelector('#job-table tbody');

      jobTableBody.innerHTML = ''; // Clear existing rows

      jobApplications.forEach((application, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
                <td>${application.company}</td>
                <td>${application.title}</td>
                <td>${new Date(application.date).toLocaleDateString()}</td>
                <td>${application.status}</td>
                <td>
                    <button class="edit-job" data-index="${index}">Edit</button>
                    <button class="delete-job" data-index="${index}">Delete</button>
                </td>
            `;

        jobTableBody.appendChild(row);
      });

      // Add event listeners for Edit and Delete actions
      document.querySelectorAll('.edit-job').forEach((button) => {
        button.addEventListener('click', (e) => {
          const index = e.target.dataset.index;
          editJobApplication(index);
        });
      });

      document.querySelectorAll('.delete-job').forEach((button) => {
        button.addEventListener('click', (e) => {
          const index = e.target.dataset.index;
          deleteJobApplication(index);
        });
      });
    });
  };

  document.getElementById('save-for-later').addEventListener('click', () => {
    const formElements = document.querySelectorAll('input, select, textarea');

    const formData = {
      timestamp: new Date().toISOString(),
      fields: Array.from(formElements).map((element) => ({
        name: element.name || element.id || element.placeholder || 'unnamed',
        value: element.value.trim(),
      })),
    };

    chrome.storage.local.get(['savedForms'], (result) => {
      const savedForms = result.savedForms || [];
      savedForms.push(formData);

      chrome.storage.local.set({ savedForms }, () => {
        alert('Form saved for future submission!');
      });
    });
  });

  const renderSavedForms = () => {
    chrome.storage.local.get(['savedForms'], (result) => {
      console.log(result)
      const savedForms = result.savedForms || [];
      const historyTableBody = document.querySelector('#history-table tbody');

      historyTableBody.innerHTML = ''; // Clear existing rows

      savedForms.forEach((form, index) => {
        const row = document.createElement('tr');

        // Display summary: the first few fields or timestamp
        const summary = form.fields
          .slice(0, 3) // Show the first three fields as a summary
          .map((field) => `${field.name}: ${field.value}`)
          .join(', ');

        row.innerHTML = `
                <td>${summary || 'Unnamed Form'}</td>
                <td>${new Date(form.timestamp).toLocaleDateString()}</td>
                <td>
                    <button class="load-form" data-index="${index}">Load</button>
                    <button class="delete-form" data-index="${index}">Delete</button>
                </td>
            `;

        historyTableBody.appendChild(row);
      });

      // Add event listeners for actions
      document.querySelectorAll('.load-form').forEach((button) => {
        button.addEventListener('click', (e) => {
          const index = e.target.dataset.index;
          loadSavedForm(index);
        });
      });

      document.querySelectorAll('.delete-form').forEach((button) => {
        button.addEventListener('click', (e) => {
          const index = e.target.dataset.index;
          deleteSavedForm(index);
        });
      });
    });
  };

  const loadSavedForm = (index) => {
    chrome.storage.local.get(['savedForms'], (result) => {
      const savedForms = result.savedForms || [];
      const form = savedForms[index];

      if (form) {
        form.fields.forEach((field) => {
          const element = document.querySelector(`[name="${field.name}"], [id="${field.name}"], [placeholder="${field.name}"]`);
          if (element) {
            element.value = field.value;
          }
        });

        alert('Form loaded successfully!');
      }
    });
  };

  const deleteSavedForm = (index) => {
    chrome.storage.local.get(['savedForms'], (result) => {
      const savedForms = result.savedForms || [];
      savedForms.splice(index, 1);

      chrome.storage.local.set({ savedForms }, () => {
        renderSavedForms();
        alert('Form deleted successfully!');
      });
    });
  };

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'updateDashboard') {
      renderJobDashboard();
    }
  });

  // Initialize
  updateProfileSelector();
  renderFields();
  renderMappings();
  populateLinkedInFields();
  populatePageFields();
  renderJobDashboard();
  renderSavedForms();
});
