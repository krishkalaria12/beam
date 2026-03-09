const React = require("react");
const { Grid, Action, ActionPanel, Icon } = require("@raycast/api");

module.exports.default = function RichGridCheck() {
  React.useEffect(() => {
    console.log(
      "[fixture-rich-components:grid]",
      JSON.stringify({
        ok: true,
        dropdownAccessory: true,
        detailSlot: true,
        fitEnum: Grid.Fit.Contain === "contain",
        insetEnum: Grid.Inset.Medium === "medium",
      }),
    );
  }, []);

  return React.createElement(
    Grid,
    {
      columns: 4,
      searchBarAccessory: React.createElement(
        Grid.Dropdown,
        { defaultValue: "all" },
        React.createElement(Grid.Dropdown.Item, { title: "All", value: "all" }),
      ),
    },
    React.createElement(
      Grid.Section,
      { title: "Cards" },
      React.createElement(Grid.Item, {
        title: "Beam Card",
        subtitle: "Rich Grid Fixture",
        content: { value: Icon.Bolt },
        accessory: { text: "card" },
        inset: Grid.Inset.Medium,
        fit: Grid.Fit.Contain,
        detail: React.createElement(
          Grid.Item.Detail,
          { markdown: "Grid detail body" },
          React.createElement(
            Grid.Item.Detail.Metadata,
            null,
            React.createElement(Grid.Item.Detail.Metadata.Label, {
              title: "Type",
              text: "Grid",
            }),
          ),
        ),
        actions: React.createElement(
          ActionPanel,
          null,
          React.createElement(Action.Open, {
            title: "Open Site",
            target: "https://beam.example.com/grid",
          }),
        ),
      }),
    ),
  );
};
