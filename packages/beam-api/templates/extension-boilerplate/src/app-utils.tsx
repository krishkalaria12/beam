import {
  Action,
  ActionPanel,
  type Application,
  List,
  getApplications,
  getDefaultApplication,
  open,
  showToast,
} from "@beam-launcher/api";
import { useEffect, useState } from "react";

function OpenInView({ target }: { target: string }) {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    void getApplications(target).then(setApplications).catch(() => setApplications([]));
  }, [target]);

  return (
    <List navigationTitle="Open In...">
      <List.Section title="Applications">
        {applications.map((application) => (
          <List.Item
            key={application.path}
            title={application.name}
            icon={application.name.slice(0, 1)}
            actions={
              <ActionPanel>
                <Action.Open title={`Open in ${application.name}`} app={application} target={target} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function AppUtils() {
  const [searchText, setSearchText] = useState("");
  const [defaultApp, setDefaultApp] = useState<Application | null>(null);

  useEffect(() => {
    if (!searchText) {
      setDefaultApp(null);
      return;
    }

    void getDefaultApplication(searchText)
      .then(setDefaultApp)
      .catch(() => setDefaultApp(null));
  }, [searchText]);

  return (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView
        title="Start typing"
        description="Enter a URL or file path to test Beam's application APIs."
      />
      {searchText ? (
        <List.Section title="Actions">
          {defaultApp ? (
            <List.Item
              title={defaultApp.name}
              subtitle="Default opener"
              icon={defaultApp.name.slice(0, 1)}
              actions={
                <ActionPanel>
                  <Action.Open title={`Open in ${defaultApp.name}`} target={searchText} />
                  <Action.Push title="Open In..." target={<OpenInView target={searchText} />} />
                  <Action
                    title="Show Result"
                    onAction={() => showToast({ title: `Default app: ${defaultApp.name}` })}
                  />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="No default application found"
              actions={
                <ActionPanel>
                  <Action
                    title="Try Opening Anyway"
                    onAction={async () => {
                      await open(searchText);
                      await showToast({ title: `Opened ${searchText}` });
                    }}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : null}
    </List>
  );
}
