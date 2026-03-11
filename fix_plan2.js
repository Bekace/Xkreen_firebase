const fs = require('fs');
const file = 'components/admin/plan-management.tsx';
let content = fs.readFileSync(file, 'utf8');

// Buscamos el segundo <Select> (el del File Upload Limit)
// y lo reemplazamos por un div estático para que siempre muestre 
// la misma unidad que el Max Storage, evitando que el usuario confunda los selects.

// Vamos a usar expresiones regulares para capturar el bloque exacto debajo de File Upload Limit
const regex = /<Label className="text-sm text-muted-foreground">File Upload Limit<\/Label>\s*<div className="flex gap-2">\s*<Input[\s\S]*?className="flex-1"\s*\/>\s*<Select\s+value=\{formData\.storage_unit\}\s+onValueChange=\{\(value\) => setFormData\(\{ \.\.\.formData, storage_unit: value \}\)\}\s*>\s*<SelectTrigger className="w-20">\s*<SelectValue \/>\s*<\/SelectTrigger>\s*<SelectContent>\s*<SelectItem value="MB">MB<\/SelectItem>\s*<SelectItem value="GB">GB<\/SelectItem>\s*<SelectItem value="TB">TB<\/SelectItem>\s*<\/SelectContent>\s*<\/Select>/m;

const replacement = `<Label className="text-sm text-muted-foreground">File Upload Limit</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={formData.max_file_upload_size}
                        onChange={(e) => setFormData({ ...formData, max_file_upload_size: e.target.value })}
                        className="flex-1"
                      />
                      <div className="flex items-center justify-center px-4 w-20 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                        {formData.storage_unit}
                      </div>`;

if(content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the match.");
}
