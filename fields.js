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
    fields.push({ name: fieldName, value: fieldValue });
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
            // Save extracted data
            Object.keys(data).forEach((key) => {
              fields.push({ name: key, value: data[key] });
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
  const headlineElement = document.querySelector('.text-body-medium');
  if (headlineElement) profileData['Headline'] = headlineElement.innerText;

  // Extract current position
  const positionElement = document.querySelector('.pv-text-details__right-panel > div:nth-child(1) span:nth-child(1)');
  if (positionElement) profileData['Current Position'] = positionElement.innerText;

  // Extract location
  const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words');
  if (locationElement) profileData['Location'] = locationElement.innerText;

  // Extract summary
  const summaryElement = document.querySelector('.pv-about__summary-text');
  if (summaryElement) profileData['Summary'] = summaryElement.innerText;

  return profileData;
}
