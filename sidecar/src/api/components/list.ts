import { createWrapperComponent, createSlottedComponent } from '../utils';

const List = createSlottedComponent('List', ['searchBarAccessory']);
const ListItem = createSlottedComponent('List.Item', ['detail', 'actions']);

const ListSection = createWrapperComponent('List.Section');
const ListEmptyView = createWrapperComponent('List.EmptyView');
const ListDropdown = createWrapperComponent('List.Dropdown');
const ListDropdownItem = createWrapperComponent('List.Dropdown.Item');
const ListDropdownSection = createWrapperComponent('List.Dropdown.Section');
const ListItemDetail = createWrapperComponent('List.Item.Detail');
const ListItemDetailMetadata = createWrapperComponent('List.Item.Detail.Metadata');
const ListItemDetailMetadataLabel = createWrapperComponent('List.Item.Detail.Metadata.Label');
const ListItemDetailMetadataLink = createWrapperComponent('List.Item.Detail.Metadata.Link');
const ListItemDetailMetadataTagList = createWrapperComponent('List.Item.Detail.Metadata.TagList');
const ListItemDetailMetadataTagListItem = createWrapperComponent(
	'List.Item.Detail.Metadata.TagList.Item'
);
const ListItemDetailMetadataSeparator = createWrapperComponent(
	'List.Item.Detail.Metadata.Separator'
);

Object.assign(List, {
	Item: ListItem,
	Section: ListSection,
	Dropdown: ListDropdown,
	EmptyView: ListEmptyView
});
Object.assign(ListDropdown, {
	Item: ListDropdownItem,
	Section: ListDropdownSection
});
Object.assign(ListItem, {
	Detail: ListItemDetail
});
Object.assign(ListItemDetail, {
	Metadata: ListItemDetailMetadata
});
Object.assign(ListItemDetailMetadata, {
	Label: ListItemDetailMetadataLabel,
	Link: ListItemDetailMetadataLink,
	TagList: ListItemDetailMetadataTagList,
	Separator: ListItemDetailMetadataSeparator
});
Object.assign(ListItemDetailMetadataTagList, {
	Item: ListItemDetailMetadataTagListItem
});

export { List };
