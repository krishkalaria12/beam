import React, { type ElementType } from 'react';
import { jsx } from 'react/jsx-runtime';

export const createLocalStorage = () => {
	const storage = new Map<string, string>();
	return {
		getItem: async (key: string) => storage.get(key),
		setItem: async (key: string, value: string) => storage.set(key, value),
		removeItem: async (key: string) => storage.delete(key),
		clear: async () => storage.clear()
	};
};

export const createWrapperComponent = (name: string) => {
	const ComponentFactory = (props: { children?: React.ReactNode }) => {
		return jsx(name as ElementType, props);
	};
	ComponentFactory.displayName = name;
	return ComponentFactory;
};

export const createSlottedComponent = (baseName: string, accessoryPropNames: string[]) => {
	const AccessorySlotFactory = createWrapperComponent('_AccessorySlot');
	const PrimitiveFactory = createWrapperComponent(baseName);

	const SlottedComponentFactory = (props: { [key: string]: any; children?: React.ReactNode }) => {
		const { children, ...rest } = props;
		const accessoryElements = [];
		for (const name of accessoryPropNames) {
			if (rest[name]) {
				accessoryElements.push(AccessorySlotFactory({ name, children: rest[name] }));
				delete rest[name];
			}
		}
		return PrimitiveFactory({
			...rest,
			children: [children, ...accessoryElements].filter(Boolean)
		});
	};
	SlottedComponentFactory.displayName = baseName;
	return SlottedComponentFactory;
};

export const createAccessorySlot = () => createWrapperComponent('_AccessorySlot');
