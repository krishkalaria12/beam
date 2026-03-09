const React = require("react");
const { Detail, Action, ActionPanel } = require("@raycast/api");

module.exports.default = function RichDetailCheck() {
  React.useEffect(() => {
    console.log(
      "[fixture-rich-components:detail]",
      JSON.stringify({
        ok: true,
        metadata: true,
        tagList: true,
      }),
    );
  }, []);

  return React.createElement(Detail, {
    markdown: "## Beam Detail Fixture",
    metadata: React.createElement(
      Detail.Metadata,
      null,
      React.createElement(Detail.Metadata.Label, {
        title: "Mode",
        text: { value: "Detail", color: "#f59e0b" },
      }),
      React.createElement(
        Detail.Metadata.TagList,
        { title: "Kinds" },
        React.createElement(Detail.Metadata.TagList.Item, { text: "beam" }),
        React.createElement(Detail.Metadata.TagList.Item, { text: "detail" }),
      ),
      React.createElement(Detail.Metadata.Separator, null),
      React.createElement(Detail.Metadata.Link, {
        title: "Link",
        target: "https://beam.example.com/detail",
        text: "beam.example.com/detail",
      }),
    ),
    actions: React.createElement(
      ActionPanel,
      null,
      React.createElement(Action.OpenInBrowser, {
        title: "Open Detail",
        url: "https://beam.example.com/detail",
      }),
    ),
  });
};
