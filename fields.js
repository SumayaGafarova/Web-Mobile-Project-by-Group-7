// Initialize fields from localStorage
const fieldsList = document.getElementById('fields-list');
const fieldForm = document.getElementById('field-form');
let fields = JSON.parse(localStorage.getItem('customFields')) || [];

// Render fields
const renderFields = () => {
  fieldsList.innerHTML = ''; // Clear the list before rendering
  fields.forEach((field, index) => {
    const listItem = document.createElement('li');
    const fieldText = document.createElement('span');
    fieldText.textContent = `${field.name}: ${field.value}`;

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      removeField(index);
    });

    listItem.appendChild(fieldText);
    listItem.appendChild(removeButton);
    fieldsList.appendChild(listItem);
  });
};


// Add a new field
fieldForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fieldName = document.getElementById('field-name').value.trim();
  const fieldValue = document.getElementById('field-value').value.trim();

  if (fieldName && fieldValue) {
    // Check for existing field
    const existingFieldIndex = fields.findIndex((field) => field.name === fieldName);
    if (existingFieldIndex !== -1) {
      // Update existing field
      fields[existingFieldIndex].value = fieldValue;
    } else {
      // Add new field
      fields.push({ name: fieldName, value: fieldValue });
    }

    // Save to localStorage and re-render
    localStorage.setItem('customFields', JSON.stringify(fields));
    renderFields();
    fieldForm.reset();
  }
});


// Remove a field
const removeField = (index) => {
  fields.splice(index, 1);
  localStorage.setItem('customFields', JSON.stringify(fields));
  renderFields();
};

// Initial render
renderFields();

document.getElementById('extract-data').addEventListener('click', async () => {
  try {
    // Execute a script to extract LinkedIn data
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
            // Update or add extracted data to fields
            Object.keys(data).forEach((key) => {
              const existingFieldIndex = fields.findIndex((field) => field.name === key);
              if (existingFieldIndex !== -1) {
                // Update existing field
                fields[existingFieldIndex].value = data[key];
              } else {
                // Add new field
                fields.push({ name: key, value: data[key] });
              }
            });
            localStorage.setItem('customFields', JSON.stringify(fields));
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

  // Extract profile name
  const nameElement = document.querySelector('h1');
  if (nameElement) profileData['Full Name'] = nameElement.innerText;

  // Extract headline
  let positionElement = document.querySelector('.text-body-medium');
  if (!positionElement) positionElement = document.querySelector(".body-small.text-color-text")
  if (positionElement) profileData['Position'] = positionElement.innerText;

  // Extract location
  const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words');
  if (locationElement) profileData['Location'] = locationElement.innerText;

  // Extract summary
  const summaryElement = document.querySelector('.pv-about__summary-text');
  if (summaryElement) profileData['Summary'] = summaryElement.innerText;

  return profileData;
}
