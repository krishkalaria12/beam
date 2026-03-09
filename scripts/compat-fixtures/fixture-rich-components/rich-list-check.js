const React = require("react");
const { List, Action, ActionPanel } = require("@raycast/api");

module.exports.default = function RichListCheck() {
  React.useEffect(() => {
    console.log(
      "[fixture-rich-components:list]",
      JSON.stringify({
        ok: true,
        detailMetadata: true,
        dropdownAccessory: true,
        actionSubmenu: true,
      }),
    );
  }, []);

  return React.createElement(
    List,
    {
      searchBarPlaceholder: "Search Beam",
      isShowingDetail: true,
      searchBarAccessory: React.createElement(
        List.Dropdown,
        { tooltip: "Change scope", defaultValue: "all" },
        React.createElement(
          List.Dropdown.Section,
          { title: "Scope" },
          React.createElement(List.Dropdown.Item, { title: "All", value: "all" }),
          React.createElement(List.Dropdown.Item, { title: "Pinned", value: "pinned" }),
        ),
      ),
    },
    React.createElement(
      List.Section,
      { title: "Primary" },
      React.createElement(List.Item, {
        id: "beam-primary",
        title: "Beam Primary",
        subtitle: "Rich List Fixture",
        accessories: [
          { text: "ready" },
          { tag: { value: "active", color: "#22c55e" } },
        ],
        detail: React.createElement(
          List.Item.Detail,
          {
            markdown: "# Beam\nRich list detail fixture",
          },
          React.createElement(
            List.Item.Detail.Metadata,
            null,
            React.createElement(List.Item.Detail.Metadata.Label, {
              title: "Status",
              text: { value: "Ready", color: "#22c55e" },
            }),
            React.createElement(List.Item.Detail.Metadata.Separator, null),
            React.createElement(List.Item.Detail.Metadata.Link, {
              title: "Docs",
              target: "https://beam.example.com",
              text: "beam.example.com",
            }),
            React.createElement(
              List.Item.Detail.Metadata.TagList,
              { title: "Tags" },
              React.createElement(List.Item.Detail.Metadata.TagList.Item, {
                text: { value: "beam", color: "#38bdf8" },
              }),
            ),
          ),
        ),
        actions: React.createElement(
          ActionPanel,
          null,
          React.createElement(Action.OpenInBrowser, {
            title: "Open Docs",
            url: "https://beam.example.com",
          }),
          React.createElement(
            ActionPanel.Submenu,
            { title: "More" },
            React.createElement(Action.CopyToClipboard, {
              title: "Copy Label",
              content: "Beam Primary",
            }),
            React.createElement(Action.Paste, {
              title: "Paste Label",
              content: "Beam Primary",
            }),
          ),
        ),
      }),
    ),
  );
};
