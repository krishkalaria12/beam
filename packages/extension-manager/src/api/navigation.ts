import React from "../shared-react";
import { currentRootElement, navigationStack } from "../state";
import { updateContainer } from "../reconciler";

export const useNavigation = () => {
  const push = (element: React.ReactElement) => {
    if (currentRootElement) {
      navigationStack.push(currentRootElement);
      updateContainer(element);
    }
  };

  const pop = () => {
    const previous = navigationStack.pop();
    if (previous) {
      updateContainer(previous);
    }
  };

  return { push, pop };
};

export const popToRootView = (): void => {
  const rootElement = navigationStack[0];
  if (!rootElement) {
    return;
  }

  navigationStack.length = 0;
  updateContainer(rootElement);
};
