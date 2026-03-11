const fs = require('fs');
const file = 'components/admin/plan-management.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Duplicate property in useState init
content = content.replace(/enable_display_branding: false,\s*enable_display_branding: true,/g, 'enable_display_branding: false,');

// Fix 2: setShowCreateDialog does not exist, it should likely be setIsPlanDialogOpen(false)
content = content.replace(/setShowCreateDialog\(false\)/g, 'setIsPlanDialogOpen(false)');

fs.writeFileSync(file, content);
