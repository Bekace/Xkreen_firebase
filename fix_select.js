const fs = require('fs');
const file = 'components/admin/plan-management.tsx';
let content = fs.readFileSync(file, 'utf8');

// The user is saying the first selector (Max Storage) might be missing or messed up
// Or the second one is disabled and they want it to look normal.

const brokenSelect1 = `                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Max Storage</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="-1"
                        value={formData.max_media_storage}
                        onChange={(e) => setFormData({ ...formData, max_media_storage: e.target.value })}
                        className="flex-1"
                      />
                      <Select
                        value={formData.storage_unit}
                        onValueChange={(value) => setFormData({ ...formData, storage_unit: value })}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MB">MB</SelectItem>
                          <SelectItem value="GB">GB</SelectItem>
                          <SelectItem value="TB">TB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>`;

// Wait, looking at the snippet, they want BOTH Selects to be active and to NOT be disabled.
// "los selectores de nuevo no estan, volvimos a atras" means the `disabled={true}` or the missing one is bothering them.

content = content.replace(
  /<Select\s+value=\{formData\.storage_unit\}\s+disabled=\{true\}\s*>/g,
  '<Select value={formData.storage_unit} onValueChange={(value) => setFormData({ ...formData, storage_unit: value })}>'
);

fs.writeFileSync(file, content);
