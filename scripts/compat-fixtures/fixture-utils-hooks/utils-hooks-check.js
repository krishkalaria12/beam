const React = require("react");
const { List, showToast } = require("@raycast/api");
const {
  FormValidation,
  useAI,
  useCachedPromise,
  useCachedState,
  useForm,
  useLocalStorage,
  usePromise,
} = require("@raycast/utils");

module.exports.default = function UtilsHooksCheck() {
  const [cachedState, setCachedState] = useCachedState("fixture-utils-hooks", 1);
  const { value: localValue, setValue, isLoading: localLoading } = useLocalStorage(
    "fixture-utils-hooks-storage",
    "initial",
  );
  const promise = usePromise(async () => "promise-ok", []);
  const cachedPromise = useCachedPromise(async () => "cached-promise-ok", []);
  const ai = useAI("Explain Beam compatibility fixture in one sentence.", {
    creativity: "low",
  });
  const form = useForm({
    initialValues: { name: "Beam" },
    validation: { name: FormValidation.Required },
    onSubmit: async () => true,
  });
  const loggedRef = React.useRef(false);
  const updatedCachedStateRef = React.useRef(false);

  React.useEffect(() => {
    if (updatedCachedStateRef.current) {
      return;
    }
    updatedCachedStateRef.current = true;
    setCachedState((value) => value + 1);
  }, [setCachedState]);

  React.useEffect(() => {
    if (!localLoading && localValue !== "stored-ok") {
      void setValue("stored-ok");
    }
  }, [localLoading, localValue, setValue]);

  React.useEffect(() => {
    if (
      loggedRef.current ||
      promise.data !== "promise-ok" ||
      cachedPromise.data !== "cached-promise-ok" ||
      ai.data !== "Beam compatibility fixture AI response." ||
      localValue !== "stored-ok"
    ) {
      return;
    }

    loggedRef.current = true;
    void form.handleSubmit(form.values);

    const summary = {
      usePromiseOk: true,
      useCachedPromiseOk: true,
      useCachedStateOk: cachedState >= 2,
      useLocalStorageOk: localValue === "stored-ok",
      useAIOk: ai.data === "Beam compatibility fixture AI response.",
      useFormOk: typeof form.handleSubmit === "function" && !form.itemProps.name.error,
    };

    void showToast({
      title: "Fixture Utils Hooks",
      message: JSON.stringify(summary),
    });
    console.log("[fixture-utils-hooks]", JSON.stringify(summary));
  }, [ai.data, cachedPromise.data, cachedState, form, localValue, promise.data]);

  return React.createElement(
    List,
    null,
    React.createElement(List.Item, {
      title: "Utils Hooks Fixture",
      subtitle: "Waiting for hook completion",
    }),
  );
};
