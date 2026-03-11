const fs = require('fs');
const file = 'components/admin/plan-management.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the File Upload Limit Select to match the styling and share the state, but disable it to prevent confusion
// or just keep it active since it updates the same formData.storage_unit
content = content.replace(
  /<Select\s+value=\{formData\.storage_unit\}\s+onValueChange=\{\(value\) => setFormData\(\{ \.\.\.formData, storage_unit: value \}\)\}\s+>/g,
  '<Select value={formData.storage_unit} onValueChange={(value) => setFormData({ ...formData, storage_unit: value })}>'
);

fs.writeFileSync(file, content);
