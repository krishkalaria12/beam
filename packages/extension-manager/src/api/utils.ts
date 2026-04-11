import type { ElementType } from "react";
import React, { jsx } from "../shared-react";

const createLocalStorage = () => {
  const storage = new Map<string, string>();
  return {
    getItem: async (key: string) => storage.get(key),
    setItem: async (key: string, value: string) => storage.set(key, value),
    removeItem: async (key: string) => storage.delete(key),
    clear: async () => storage.clear(),
  };
};

export const createWrapperComponent = (name: string) => {
  const ComponentFactory = (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    const normalizedChildren =
      props.children === undefined ? undefined : React.Children.toArray(props.children);
    return jsx(name as ElementType, {
      ...props,
      children: normalizedChildren,
    });
  };
  ComponentFactory.displayName = name;
  return ComponentFactory;
};

export const createSlottedComponent = (baseName: string, accessoryPropNames: string[]) => {
  const AccessorySlotFactory = createWrapperComponent("_AccessorySlot");
  const PrimitiveFactory = createWrapperComponent(baseName);

  const SlottedComponentFactory = (props: { [key: string]: any; children?: React.ReactNode }) => {
    const { children, ...rest } = props;
    const accessoryElements: React.ReactElement[] = [];
    for (const name of accessoryPropNames) {
      if (rest[name]) {
        accessoryElements.push(
          React.createElement(AccessorySlotFactory, {
            key: name,
            name,
            children: rest[name],
          }),
        );
        delete rest[name];
      }
    }

    const normalizedChildren = React.Children.toArray(children);
    return PrimitiveFactory({
      ...rest,
      children: [...normalizedChildren, ...accessoryElements],
    });
  };
  SlottedComponentFactory.displayName = baseName;
  return SlottedComponentFactory;
};

const createAccessorySlot = () => createWrapperComponent("_AccessorySlot");
