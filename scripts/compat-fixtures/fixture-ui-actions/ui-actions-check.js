const { List, Form, ActionPanel, Action, showToast, useNavigation } = require("@raycast/api");

function FormView() {
  return React.createElement(
    Form,
    {
      actions: React.createElement(
        ActionPanel,
        null,
        React.createElement(Action.SubmitForm, {
          title: "Submit Fixture Form",
          onSubmit: (values) => {
            void showToast({
              title: "Fixture Form Submitted",
              message: JSON.stringify(values ?? {}),
            });
          },
        }),
      ),
    },
    React.createElement(Form.TextField, {
      id: "name",
      title: "Name",
      placeholder: "Type something",
    }),
  );
}

module.exports.default = function uiActionsCheck() {
  const navigation = useNavigation();

  const pushNestedList = () => {
    navigation.push(
      React.createElement(
        List,
        null,
        React.createElement(List.Item, {
          id: "nested-item",
          title: "Nested Fixture View",
          subtitle: "Navigation push succeeded",
        }),
      ),
    );
  };

  const pushForm = () => {
    navigation.push(React.createElement(FormView));
  };

  return React.createElement(
    List,
    {
      searchBarPlaceholder: "Phase 0 UI fixture",
    },
    React.createElement(List.Item, {
      id: "ui-actions-root",
      title: "UI and Actions Smoke",
      subtitle: "Run actions to validate dispatch",
      actions: React.createElement(
        ActionPanel,
        null,
        React.createElement(Action, {
          title: "Show Toast",
          onAction: () => {
            void showToast({
              title: "Fixture UI",
              message: "Action dispatch succeeded",
            });
          },
        }),
        React.createElement(Action, {
          title: "Push Form",
          onAction: pushForm,
        }),
        React.createElement(Action, {
          title: "Push Nested List",
          onAction: pushNestedList,
        }),
      ),
    }),
  );
};
