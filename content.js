chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autofillForms') {
        const { fields = [], mappings = {} } = request.profileData;

        if (!fields.length) {
            alert('No fields available to autofill.');
            return;
        }
        const fieldValueMap = {};
        fields.forEach(({ name, value }) => {
            fieldValueMap[name] = value;
        });

        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach((element) => {
            const fieldName = element.name || element.id || element.placeholder;

            if (fieldName) {
                if (fieldValueMap[fieldName] !== undefined) {
                    element.value = fieldValueMap[fieldName];
                } else {
                    const sourceField = Object.keys(mappings).find((key) => mappings[key] === fieldName);
                    if (sourceField && fieldValueMap[sourceField] !== undefined) {
                        element.value = fieldValueMap[sourceField];
                    }
                }
            }
        });

        alert('Forms have been autofilled!');
    }
    if (request.action === 'fetchPageFields') {
        const formElements = document.querySelectorAll('input, select, textarea');
        const pageFields = [];

        formElements.forEach((element) => {
            const nameOrId = element.name || element.id || element.placeholder;
            if (nameOrId) {
                pageFields.push(nameOrId);
            }
        });
        sendResponse({ pageFields }); // Send response back
    }
});
