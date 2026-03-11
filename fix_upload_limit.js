const fs = require('fs');
const file = 'components/admin/plan-management.tsx';
let content = fs.readFileSync(file, 'utf8');

// The issue is that the storage_unit for file upload size isn't independent in the UI, it's shared.
// Also, the conversion logic might be flawed if it expects GB but it's MB.

// The issue with the modal is that they share formData.storage_unit
// Let's replace the select for File Upload Limit to be disabled or removed, 
// as it shares the unit with max_storage. Or just leave it as it shares the state.

fs.writeFileSync(file, content);
