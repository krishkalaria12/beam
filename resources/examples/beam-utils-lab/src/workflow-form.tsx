import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  open,
  showToast,
} from "@beam-launcher/api";
import {
  DeeplinkType,
  FormValidation,
  createDeeplink,
  useForm,
  useLocalStorage,
} from "@beam-launcher/utils";
import { useMemo } from "react";
import { LAB_COMMANDS } from "./lab";

type WorkflowFormValues = {
  audience: string;
  note: string;
  openAfterSubmit: boolean;
  targetCommand: string;
  workflowName: string;
};

type WorkflowDraft = WorkflowFormValues & {
  createdAt: string;
  deeplink: string;
};

const DEFAULT_VALUES: WorkflowFormValues = {
  audience: "beam-launcher",
  note: "Capture a Beam runtime summary and copy it into the clipboard.",
  openAfterSubmit: false,
  targetCommand: LAB_COMMANDS.captureSnapshot,
  workflowName: "Release Pulse",
};

export default function BeamWorkflowForm() {
  const { value: drafts, setValue: setDrafts, isLoading: isDraftsLoading } =
    useLocalStorage<WorkflowDraft[]>("beam-utils-lab:workflow-drafts", []);

  const { handleSubmit, itemProps, values } = useForm<WorkflowFormValues>({
    initialValues: DEFAULT_VALUES,
    validation: {
      workflowName: FormValidation.Required,
      targetCommand: FormValidation.Required,
      audience: FormValidation.Required,
    },
    onSubmit: async (submittedValues) => {
      const deeplink = createDeeplink({
        type: DeeplinkType.Extension,
        command: submittedValues.targetCommand,
        arguments: {
          audience: submittedValues.audience,
          workflowName: submittedValues.workflowName,
        },
        fallbackText: submittedValues.note,
      });

      const draft: WorkflowDraft = {
        ...submittedValues,
        createdAt: new Date().toISOString(),
        deeplink,
      };

      await setDrafts([draft, ...(drafts ?? [])].slice(0, 5));
      await Clipboard.copy(JSON.stringify(draft, null, 2));
      await showToast({
        style: Toast.Style.Success,
        title: "Workflow draft copied",
        message: "Saved to local storage and copied to the clipboard.",
      });

      if (submittedValues.openAfterSubmit) {
        await open(deeplink);
      }
    },
  });

  const deeplinkPreview = useMemo(
    () =>
      createDeeplink({
        type: DeeplinkType.Extension,
        command: values.targetCommand ?? LAB_COMMANDS.captureSnapshot,
        arguments: {
          audience: values.audience ?? "",
          workflowName: values.workflowName ?? "",
        },
        fallbackText: values.note ?? "",
      }),
    [values.audience, values.note, values.targetCommand, values.workflowName],
  );

  const preview = useMemo(
    () =>
      JSON.stringify(
        {
          audience: values.audience ?? "",
          note: values.note ?? "",
          openAfterSubmit: Boolean(values.openAfterSubmit),
          targetCommand: values.targetCommand ?? LAB_COMMANDS.captureSnapshot,
          workflowName: values.workflowName ?? "",
          deeplink: deeplinkPreview,
          savedDrafts: drafts?.length ?? 0,
        },
        null,
        2,
      ),
    [deeplinkPreview, drafts?.length, values.audience, values.note, values.openAfterSubmit, values.targetCommand, values.workflowName],
  );

  return (
    <Form
      isLoading={isDraftsLoading}
      navigationTitle="Beam Workflow Form"
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://github.com/krishkalaria12/beam/tree/main/resources/docs/extensions"
          text="Beam Docs"
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Draft">
            <Action.SubmitForm
              key="save-workflow-draft"
              title="Save Workflow Draft"
              onSubmit={(submittedValues) => handleSubmit(submittedValues as WorkflowFormValues)}
            />
            <Action
              key="copy-deeplink-preview"
              title="Copy Deeplink Preview"
              icon={Icon.Link}
              onAction={() => Clipboard.copy(deeplinkPreview)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField title="Workflow Name" {...itemProps.workflowName} />
      <Form.Dropdown title="Target Command" {...itemProps.targetCommand}>
        <Form.Dropdown.Section title="Beam Utils Lab">
          <Form.Dropdown.Item value={LAB_COMMANDS.captureSnapshot} title="Capture Beam Snapshot" icon={Icon.Stars} />
          <Form.Dropdown.Item value={LAB_COMMANDS.dashboard} title="Beam Utils Dashboard" icon={Icon.Package} />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.TextField title="Audience" {...itemProps.audience} />
      <Form.Checkbox title="Open After Submit" label="Open the deeplink after saving" {...itemProps.openAfterSubmit} />
      <Form.TextArea title="Fallback Text" {...itemProps.note} />
      <Form.Separator />
      <Form.Description title="Preview" text={preview} />
      <Form.Description title="Stored Drafts" text={`${drafts?.length ?? 0} draft(s) currently saved in Beam local storage.`} />
    </Form>
  );
}
