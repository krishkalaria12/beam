import type { ComponentType } from "react";

import { DetailRootNode } from "@/modules/extensions/components/runner/nodes/detail/detail-root-node";
import { MetadataLabelNode } from "@/modules/extensions/components/runner/nodes/detail/metadata-label-node";
import { MetadataLinkNode } from "@/modules/extensions/components/runner/nodes/detail/metadata-link-node";
import { MetadataNode } from "@/modules/extensions/components/runner/nodes/detail/metadata-node";
import { MetadataSeparatorNode } from "@/modules/extensions/components/runner/nodes/detail/metadata-separator-node";
import { MetadataTagListItemNode } from "@/modules/extensions/components/runner/nodes/detail/metadata-tag-list-item-node";
import { MetadataTagListNode } from "@/modules/extensions/components/runner/nodes/detail/metadata-tag-list-node";
import { FormCheckboxNode } from "@/modules/extensions/components/runner/nodes/form/form-checkbox-node";
import { FormDatePickerNode } from "@/modules/extensions/components/runner/nodes/form/form-date-picker-node";
import { FormDescriptionNode } from "@/modules/extensions/components/runner/nodes/form/form-description-node";
import { FormFilePickerNode } from "@/modules/extensions/components/runner/nodes/form/form-file-picker-node";
import { FormLinkAccessoryNode } from "@/modules/extensions/components/runner/nodes/form/form-link-accessory-node";
import { FormPasswordFieldNode } from "@/modules/extensions/components/runner/nodes/form/form-password-field-node";
import { FormRootNode } from "@/modules/extensions/components/runner/nodes/form/form-root-node";
import { FormTagPickerNode } from "@/modules/extensions/components/runner/nodes/form/form-tag-picker-node";
import { FormTextAreaNode } from "@/modules/extensions/components/runner/nodes/form/form-text-area-node";
import { FormTextFieldNode } from "@/modules/extensions/components/runner/nodes/form/form-text-field-node";
import { GridEmptyViewNode } from "@/modules/extensions/components/runner/nodes/grid/grid-empty-view-node";
import { GridItemNode } from "@/modules/extensions/components/runner/nodes/grid/grid-item-node";
import { GridSectionNode } from "@/modules/extensions/components/runner/nodes/grid/grid-section-node";
import { ListEmptyViewNode } from "@/modules/extensions/components/runner/nodes/list/list-empty-view-node";
import { ListItemNode } from "@/modules/extensions/components/runner/nodes/list/list-item-node";
import { ListSectionNode } from "@/modules/extensions/components/runner/nodes/list/list-section-node";
import { AccessoryDropdownNode } from "@/modules/extensions/components/runner/nodes/shared/accessory-dropdown-node";
import { DropdownItemNode } from "@/modules/extensions/components/runner/nodes/shared/dropdown-item-node";
import { DropdownSectionNode } from "@/modules/extensions/components/runner/nodes/shared/dropdown-section-node";
import type { RunnerNodeComponentProps } from "@/modules/extensions/components/runner/nodes/types";

export const runnerNodeComponentMap = new Map<string, ComponentType<RunnerNodeComponentProps>>([
  ["Detail", DetailRootNode],
  ["List.Item.Detail", DetailRootNode],
  ["Grid.Item.Detail", DetailRootNode],
  ["Detail.Metadata", MetadataNode],
  ["List.Item.Detail.Metadata", MetadataNode],
  ["Grid.Item.Detail.Metadata", MetadataNode],
  ["Detail.Metadata.Label", MetadataLabelNode],
  ["List.Item.Detail.Metadata.Label", MetadataLabelNode],
  ["Grid.Item.Detail.Metadata.Label", MetadataLabelNode],
  ["Detail.Metadata.Link", MetadataLinkNode],
  ["List.Item.Detail.Metadata.Link", MetadataLinkNode],
  ["Grid.Item.Detail.Metadata.Link", MetadataLinkNode],
  ["Detail.Metadata.TagList", MetadataTagListNode],
  ["List.Item.Detail.Metadata.TagList", MetadataTagListNode],
  ["Grid.Item.Detail.Metadata.TagList", MetadataTagListNode],
  ["Detail.Metadata.TagList.Item", MetadataTagListItemNode],
  ["List.Item.Detail.Metadata.TagList.Item", MetadataTagListItemNode],
  ["Grid.Item.Detail.Metadata.TagList.Item", MetadataTagListItemNode],
  ["Detail.Metadata.Separator", MetadataSeparatorNode],
  ["List.Item.Detail.Metadata.Separator", MetadataSeparatorNode],
  ["Grid.Item.Detail.Metadata.Separator", MetadataSeparatorNode],
  ["List.Item", ListItemNode],
  ["List.Section", ListSectionNode],
  ["List.Dropdown", AccessoryDropdownNode],
  ["List.Dropdown.Item", DropdownItemNode],
  ["List.Dropdown.Section", DropdownSectionNode],
  ["List.EmptyView", ListEmptyViewNode],
  ["Grid.Item", GridItemNode],
  ["Grid.Section", GridSectionNode],
  ["Grid.Dropdown", AccessoryDropdownNode],
  ["Grid.Dropdown.Item", DropdownItemNode],
  ["Grid.Dropdown.Section", DropdownSectionNode],
  ["Grid.EmptyView", GridEmptyViewNode],
  ["Form", FormRootNode],
  ["Form.TextField", FormTextFieldNode],
  ["Form.PasswordField", FormPasswordFieldNode],
  ["Form.TextArea", FormTextAreaNode],
  ["Form.Checkbox", FormCheckboxNode],
  ["Form.DatePicker", FormDatePickerNode],
  ["Form.Dropdown", AccessoryDropdownNode],
  ["Form.Dropdown.Item", DropdownItemNode],
  ["Form.Dropdown.Section", DropdownSectionNode],
  ["Form.TagPicker", FormTagPickerNode],
  ["Form.FilePicker", FormFilePickerNode],
  ["Form.Description", FormDescriptionNode],
  ["Form.LinkAccessory", FormLinkAccessoryNode],
]);
