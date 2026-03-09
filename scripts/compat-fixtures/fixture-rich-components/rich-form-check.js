const React = require("react");
const { Form, Action, ActionPanel } = require("@raycast/api");

module.exports.default = function RichFormCheck() {
  React.useEffect(() => {
    console.log(
      "[fixture-rich-components:form]",
      JSON.stringify({
        ok: true,
        dropdown: true,
        tagPicker: true,
        submitAction: true,
      }),
    );
  }, []);

  return React.createElement(
    Form,
    {
      actions: React.createElement(
        ActionPanel,
        null,
        React.createElement(Action.SubmitForm, { title: "Submit Fixture" }),
      ),
    },
    React.createElement(Form.Description, { text: "Beam form fixture" }),
    React.createElement(Form.TextField, {
      id: "name",
      title: "Name",
      defaultValue: "Beam",
    }),
    React.createElement(
      Form.Dropdown,
      {
        id: "scope",
        title: "Scope",
        defaultValue: "all",
      },
      React.createElement(
        Form.Dropdown.Section,
        { title: "Options" },
        React.createElement(Form.Dropdown.Item, { title: "All", value: "all" }),
        React.createElement(Form.Dropdown.Item, { title: "Pinned", value: "pinned" }),
      ),
    ),
    React.createElement(
      Form.TagPicker,
      {
        id: "tags",
        title: "Tags",
        defaultValue: ["beam"],
      },
      React.createElement(
        Form.TagPicker.Section,
        { title: "Kinds" },
        React.createElement(Form.TagPicker.Item, { title: "Beam", value: "beam" }),
        React.createElement(Form.TagPicker.Item, { title: "Fixture", value: "fixture" }),
      ),
    ),
    React.createElement(Form.Checkbox, {
      id: "enabled",
      title: "Enabled",
      defaultValue: true,
      label: "Enable fixture",
    }),
    React.createElement(Form.DatePicker, {
      id: "date",
      title: "Date",
      defaultValue: "2026-03-08",
    }),
  );
};
