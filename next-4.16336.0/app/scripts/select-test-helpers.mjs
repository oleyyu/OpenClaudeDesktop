// shared-frame xb/Tb: settings now use a real CDS listbox, not native select.
// Keep catalog/value/persistence assertions; exercise the visible interaction.
export async function chooseSetting(page, label, value) {
  const trigger=page.locator('button[role="combobox"]').and(page.getByRole('combobox',{name:label,exact:true}));
  await trigger.click();
  const list=page.getByRole('listbox',{name:label,exact:true});
  await list.waitFor();
  await list.locator(`[role="option"][data-value=${JSON.stringify(String(value))}]`).click();
  await list.waitFor({state:'detached'});
}
export async function settingOptions(page, label) {
  const trigger=page.getByRole('combobox',{name:label,exact:true});await trigger.click();
  const list=page.getByRole('listbox',{name:label,exact:true});await list.waitFor();
  const options=await list.getByRole('option').evaluateAll(nodes=>nodes.map(node=>[node.dataset.value,node.firstElementChild.textContent]));
  await page.keyboard.press('Escape');await list.waitFor({state:'detached'});return options;
}
