import { createWrapperComponent, createSlottedComponent } from "../utils";

const Grid = createSlottedComponent("Grid", ["searchBarAccessory"]);
const GridItem = createSlottedComponent("Grid.Item", ["detail", "actions"]);

const GridSection = createWrapperComponent("Grid.Section");
const GridDropdown = createWrapperComponent("Grid.Dropdown");
const GridDropdownItem = createWrapperComponent("Grid.Dropdown.Item");
const GridDropdownSection = createWrapperComponent("Grid.Dropdown.Section");
const GridEmptyView = createSlottedComponent("Grid.EmptyView", ["actions"]);
const GridItemDetail = createWrapperComponent("Grid.Item.Detail");
const GridItemDetailMetadata = createWrapperComponent("Grid.Item.Detail.Metadata");
const GridItemDetailMetadataLabel = createWrapperComponent("Grid.Item.Detail.Metadata.Label");
const GridItemDetailMetadataLink = createWrapperComponent("Grid.Item.Detail.Metadata.Link");
const GridItemDetailMetadataTagList = createWrapperComponent("Grid.Item.Detail.Metadata.TagList");
const GridItemDetailMetadataTagListItem = createWrapperComponent(
  "Grid.Item.Detail.Metadata.TagList.Item",
);
const GridItemDetailMetadataSeparator = createWrapperComponent(
  "Grid.Item.Detail.Metadata.Separator",
);

const Inset = {
  Small: "small",
  Medium: "medium",
  Large: "large",
} as const;

const Fit = {
  Contain: "contain",
  Fill: "fill",
} as const;

Object.assign(Grid, {
  Section: GridSection,
  Item: GridItem,
  Dropdown: GridDropdown,
  EmptyView: GridEmptyView,
  Inset,
  Fit,
});
Object.assign(GridDropdown, {
  Item: GridDropdownItem,
  Section: GridDropdownSection,
});
Object.assign(GridItem, {
  Detail: GridItemDetail,
});
Object.assign(GridItemDetail, {
  Metadata: GridItemDetailMetadata,
});
Object.assign(GridItemDetailMetadata, {
  Label: GridItemDetailMetadataLabel,
  Link: GridItemDetailMetadataLink,
  TagList: GridItemDetailMetadataTagList,
  Separator: GridItemDetailMetadataSeparator,
});
Object.assign(GridItemDetailMetadataTagList, {
  Item: GridItemDetailMetadataTagListItem,
});

export { Grid };
