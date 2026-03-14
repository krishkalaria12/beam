import { EXTENSIONS_RUNNER_FORM_FIELD_TYPE_SET } from "@/modules/extensions/constants";
import type { FormField, FormValue } from "@/modules/extensions/components/runner/types";
import type { ExtensionUiNode } from "@/modules/extensions/runtime/store";
import { asBoolean, asString } from "@/modules/extensions/components/runner/utils";

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export function collectFormFields(
  tree: Map<number, ExtensionUiNode>,
  root: ExtensionUiNode,
): FormField[] {
  const fields: FormField[] = [];

  const walk = (nodeId: number) => {
    const node = tree.get(nodeId);
    if (!node) {
      return;
    }

    if (EXTENSIONS_RUNNER_FORM_FIELD_TYPE_SET.has(node.type)) {
      const key = asString(node.props.id, String(node.id));
      const title = asString(node.props.title, key);
      const placeholder = asString(node.props.placeholder).trim() || undefined;
      let defaultValue: FormValue = "";
      let controlledValue: FormValue | undefined;
      const options: Array<{ value: string; title: string; icon?: unknown }> = [];
      const optionSections: Array<{
        title?: string;
        items: Array<{ value: string; title: string; icon?: unknown }>;
      }> = [];

      if (node.type === "Form.Checkbox") {
        defaultValue = asBoolean(node.props.value, asBoolean(node.props.defaultValue));
        if (typeof node.props.value === "boolean") {
          controlledValue = node.props.value;
        }
      } else if (node.type === "Form.Dropdown" || node.type === "Form.TagPicker") {
        const itemType =
          node.type === "Form.Dropdown" ? "Form.Dropdown.Item" : "Form.TagPicker.Item";
        const sectionType =
          node.type === "Form.Dropdown" ? "Form.Dropdown.Section" : "Form.TagPicker.Section";
        const collectOptions = (candidateId: number): Array<{
          value: string;
          title: string;
          icon?: unknown;
        }> => {
          const candidate = tree.get(candidateId);
          if (!candidate) {
            return [];
          }
          if (candidate.type === itemType) {
            const value = asString(
              candidate.props.value,
              asString(candidate.props.title, String(candidate.id)),
            );
            const optionTitle = asString(candidate.props.title, value);
            const option = { value, title: optionTitle, icon: candidate.props.icon };
            options.push(option);
            return [option];
          }
          const nestedOptions: Array<{ value: string; title: string; icon?: unknown }> = [];
          if (candidate.type === sectionType) {
            for (const nestedId of candidate.children) {
              nestedOptions.push(...collectOptions(nestedId));
            }

            if (nestedOptions.length > 0) {
              optionSections.push({
                title: asString(candidate.props.title).trim() || undefined,
                items: nestedOptions,
              });
            }
            return nestedOptions;
          }

          for (const nestedId of candidate.children) {
            nestedOptions.push(...collectOptions(nestedId));
          }
          return nestedOptions;
        };

        for (const childId of node.children) {
          collectOptions(childId);
        }

        if (node.type === "Form.TagPicker") {
          const rawControlled = readStringArray(node.props.value);
          const rawDefault = readStringArray(node.props.defaultValue);
          defaultValue = rawControlled.length > 0 ? rawControlled : rawDefault;
          if (rawControlled.length > 0) {
            controlledValue = rawControlled;
          }
        } else {
          defaultValue =
            asString(node.props.value).trim() ||
            asString(node.props.defaultValue).trim() ||
            options[0]?.value ||
            "";
          if (typeof node.props.value === "string") {
            controlledValue = node.props.value.trim();
          }
        }
      } else if (node.type === "Form.FilePicker") {
        const rawControlled = readStringArray(node.props.value);
        const rawDefault = readStringArray(node.props.defaultValue);
        defaultValue = rawControlled.length > 0 ? rawControlled : rawDefault;
        if (rawControlled.length > 0) {
          controlledValue = rawControlled;
        }
      } else if (node.type === "Form.DatePicker") {
        defaultValue =
          asString(node.props.value).trim() || asString(node.props.defaultValue).trim() || "";
        if (typeof node.props.value === "string") {
          controlledValue = node.props.value.trim();
        }
      } else {
        defaultValue =
          asString(node.props.value).trim() || asString(node.props.defaultValue).trim() || "";
        if (typeof node.props.value === "string") {
          controlledValue = node.props.value.trim();
        }
      }

      fields.push({
        nodeId: node.id,
        key,
        type: node.type,
        title,
        placeholder,
        options,
        optionSections: optionSections.length > 0 ? optionSections : undefined,
        defaultValue,
        controlledValue,
        hasOnChange: asBoolean(node.props.onChange),
        hasOnBlur: asBoolean(node.props.onBlur),
        error: asString(node.props.error).trim() || undefined,
        info: asString(node.props.info).trim() || undefined,
      });
    }

    for (const childId of node.children) {
      walk(childId);
    }
  };

  for (const childId of root.children) {
    walk(childId);
  }

  return fields;
}
