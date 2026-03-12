export interface PreferenceOption {
  title: string;
  value: string;
}

interface BasePreference {
  name: string;
  title?: string;
  description?: string;
  required?: boolean;
  default?: string | boolean;
  data?: PreferenceOption[];
}

export type Preference =
  | (BasePreference & {
      type: "checkbox";
      label: string;
    })
  | (BasePreference & {
      type: "textfield" | "password" | "dropdown" | "appPicker" | "file" | "directory";
    });
