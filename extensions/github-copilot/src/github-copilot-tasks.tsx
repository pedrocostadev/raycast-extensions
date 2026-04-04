import { Color, MenuBarExtra, open } from "@raycast/api";
import { useTasks } from "./hooks/useTasks";
import { useMemo, useState, useEffect } from "react";
import { withAccessToken } from "@raycast/utils";
import { client, provider } from "./lib/oauth";
import { getTaskIcon, getMenuBarShortcut, truncate } from "./utils";

function Command() {
  const { isLoading, tasks } = useTasks();

  const openTasks = useMemo(
    () =>
      tasks.filter(
        (taskWithPullRequest) => !taskWithPullRequest.pullRequest || taskWithPullRequest.pullRequest.state === "OPEN",
      ),
    [tasks],
  );

  if (openTasks.length === 0) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={{ source: "copilot.svg", tintColor: Color.PrimaryText }}
      tooltip="GitHub Copilot Tasks"
      isLoading={isLoading}
    >
      {openTasks.map((taskWithPullRequest, index) => {
        const { pullRequest } = taskWithPullRequest;
        const title = pullRequest?.title ?? `Task ${taskWithPullRequest.task.id}`;
        const subtitle = pullRequest
          ? `${pullRequest.repository.owner.login}/${pullRequest.repository.name}`
          : undefined;
        // URL format: https://github.com/{owner}/{repo}/tasks/{task_id}
        const url = pullRequest
          ? `https://github.com/${pullRequest.repository.owner.login}/${pullRequest.repository.name}/tasks/${taskWithPullRequest.task.id}`
          : undefined;

        return (
          <MenuBarExtra.Item
            key={taskWithPullRequest.key}
            title={truncate(title, 35)}
            subtitle={subtitle}
            onAction={() => {
              if (url) {
                open(url);
              }
            }}
            icon={getTaskIcon(taskWithPullRequest)}
            shortcut={getMenuBarShortcut(index)}
          />
        );
      })}
    </MenuBarExtra>
  );
}

const AuthenticatedCommand = withAccessToken(provider)(Command);

// Wrap the menu bar command so it only renders (and triggers auth) when a token
// already exists. This prevents the background 30-minute refresh from starting
// a new OAuth flow that would overwrite the PKCE state stored by an interactive
// command mid-authentication, causing an "OAuth State Mismatch" error.
export default function MenuBarCommand() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    client.getTokens().then((tokenSet) => {
      if (isMounted) {
        setIsAuthenticated(!!tokenSet?.accessToken);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isAuthenticated !== true) return null;

  return <AuthenticatedCommand />;
}
