chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request.profileData);

    if (request.action === 'autofillForms') {
        const { fields = [], mappings = {} } = request.profileData;

        if (!fields.length) {
            alert('No fields available to autofill.');
            return;
        }

        // Create a lookup map for quick access to values by field name
        const fieldValueMap = {};
        fields.forEach(({ name, value }) => {
            fieldValueMap[name] = value;
        });

        // Autofill forms on the current page
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach((element) => {
            // Check if the element matches any field name directly
            const fieldName = element.name || element.id || element.placeholder;

            if (fieldName && fieldValueMap[fieldName] !== undefined) {
                element.value = fieldValueMap[fieldName];
            }

            // Check if the element matches any mapping
            Object.keys(mappings).forEach((mappedField) => {
                if (fieldName === mappedField && fieldValueMap[mappings[mappedField]] !== undefined) {
                    element.value = fieldValueMap[mappings[mappedField]];
                }
            });
        });

        alert('Forms have been autofilled!');
    }
});
