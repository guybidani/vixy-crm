import { useWorkspaceOptions } from "./useWorkspaceOptions";

/**
 * Returns the customized label for a CRM module.
 * Usage: const contactsLabel = useModuleLabel("contacts");
 */
export function useModuleLabel(moduleKey: string): string {
  const { moduleLabels } = useWorkspaceOptions();
  return moduleLabels[moduleKey] || moduleKey;
}
