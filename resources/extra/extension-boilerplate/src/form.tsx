import { Action, ActionPanel, Form, Toast, showToast } from "@beam-launcher/api";
import { useState } from "react";

export default function FormElements() {
  const [name, setName] = useState("Beam");
  const [enabled, setEnabled] = useState(true);

  return (
    <Form
      navigationTitle="Form Elements"
      searchBarAccessory={
        <Form.LinkAccessory target="https://github.com/krishkalaria12/beam" text="Open Beam" />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values) =>
              showToast({
                style: Toast.Style.Success,
                title: "Submitted",
                message: JSON.stringify(values),
              })
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="TextField" value={name} onChange={setName} />
      <Form.PasswordField id="password" title="PasswordField" />
      <Form.TextArea
        id="description"
        title="TextArea"
        defaultValue="Describe your extension here."
      />
      <Form.Checkbox
        id="enabled"
        title="Checkbox"
        label="Enabled"
        value={enabled}
        onChange={setEnabled}
      />
      <Form.DatePicker
        id="date"
        title="DatePicker"
        type={Form.DatePicker.Type.Date}
        defaultValue={new Date()}
      />
      <Form.Dropdown id="emoji" title="Dropdown" defaultValue="rocket">
        <Form.Dropdown.Item value="rocket" title="Rocket" icon="🚀" />
        <Form.Dropdown.Item value="sparkles" title="Sparkles" icon="✨" />
        <Form.Dropdown.Item value="beam" title="Beam" icon="🛰️" />
      </Form.Dropdown>
      <Form.TagPicker id="tags" title="TagPicker" defaultValue={["beam"]}>
        <Form.TagPicker.Item value="beam" title="Beam" icon="🛰️" />
        <Form.TagPicker.Item value="linux" title="Linux" icon="🐧" />
        <Form.TagPicker.Item value="extensions" title="Extensions" icon="🧩" />
      </Form.TagPicker>
      <Form.Separator />
      <Form.FilePicker id="files" title="FilePicker" allowMultipleSelection />
      <Form.Description
        title="Description"
        text="Use this command as a base for forms, validation, and persistent values."
      />
    </Form>
  );
}
