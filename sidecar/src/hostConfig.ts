import type { Fiber, HostConfig, OpaqueHandle, ReactContext } from 'react-reconciler';
import type {
	ComponentType,
	ComponentProps,
	Container,
	FlareInstance,
	TextInstance,
	ParentInstance,
	AnyInstance
} from './types';
import {
	instances,
	getNextInstanceId,
	addToCommitBuffer,
	clearCommitBuffer,
	commitBuffer
} from './state';
import { writeLog, writeOutput } from './io';
import { serializeProps, optimizeCommitBuffer } from './utils';
import React from 'react';

const handleAccessory = (parent: ParentInstance, child: AnyInstance) => {
	if (child.type === '_AccessorySlot') {
		if ('props' in child) {
			const accessoryName = child.props.name as string;
			const accessoryInstance = child.children[0];

			if (accessoryInstance && 'id' in parent) {
				if (!parent.namedChildren) {
					parent.namedChildren = {};
				}
				parent.namedChildren[accessoryName] = accessoryInstance.id;

				addToCommitBuffer({
					type: 'UPDATE_PROPS',
					payload: { id: parent.id, props: parent.props, namedChildren: parent.namedChildren }
				});
			}
		}
		return true;
	}
	return false;
};

const appendChildToParent = (parent: ParentInstance, child: AnyInstance) => {
	if (handleAccessory(parent, child)) {
		return;
	}

	const existingIndex = parent.children.findIndex(({ id }) => id === child.id);
	if (existingIndex > -1) {
		parent.children.splice(existingIndex, 1);
	}
	parent.children.push(child);
	addToCommitBuffer({
		type: 'APPEND_CHILD',
		payload: { parentId: parent.id, childId: child.id }
	});
};

const insertChildBefore = (
	parent: ParentInstance,
	child: AnyInstance,
	beforeChild: AnyInstance
) => {
	if (handleAccessory(parent, child)) {
		return;
	}

	const existingIndex = parent.children.findIndex(({ id }) => id === child.id);
	if (existingIndex > -1) {
		parent.children.splice(existingIndex, 1);
	}

	const beforeIndex = parent.children.findIndex(({ id }) => id === beforeChild.id);
	if (beforeIndex !== -1) {
		parent.children.splice(beforeIndex, 0, child);
		addToCommitBuffer({
			type: 'INSERT_BEFORE',
			payload: {
				parentId: parent.id,
				childId: child.id,
				beforeId: beforeChild.id
			}
		});
	} else {
		appendChildToParent(parent, child);
	}
};

const removeChildFromParent = (parent: ParentInstance, child: AnyInstance) => {
	parent.children = parent.children.filter(({ id }) => id !== child.id);
	addToCommitBuffer({
		type: 'REMOVE_CHILD',
		payload: { parentId: parent.id, childId: child.id }
	});
};

function processProps(props: Record<string, unknown>) {
	const propsToSerialize: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(props)) {
		if (key === 'children' || key === 'ref') continue;

		// Keep React elements opaque here; invoking function components from props can
		// trigger hooks outside React render and break extension trees.
		propsToSerialize[key] = value;
	}

	return { propsToSerialize, namedChildren: {} };
}

export const hostConfig: HostConfig<
	ComponentType,
	ComponentProps,
	Container,
	FlareInstance,
	TextInstance,
	never,
	never,
	never,
	FlareInstance | TextInstance,
	object,
	never,
	NodeJS.Timeout,
	number,
	null
> = {
	getPublicInstance(instance) {
		return instance;
	},
	getRootHostContext() {
		return {};
	},
	getChildHostContext() {
		return {};
	},

	prepareForCommit: () => null,
	resetAfterCommit: () => {
		if (commitBuffer.length > 0) {
			const now = Date.now();
			const optimizedPayload = optimizeCommitBuffer(commitBuffer);
			writeLog(`time to optimize: ${Date.now() - now}ms`);
			writeOutput({
				type: 'BATCH_UPDATE',
				payload: optimizedPayload
			});
			clearCommitBuffer();
		}
	},

	createInstance(type, props, root, hostContext, internalInstanceHandle: OpaqueHandle) {
		const componentType =
			typeof type === 'string' ? type : type.displayName || type.name || 'Anonymous';
		const id = getNextInstanceId();

		const instance: FlareInstance = {
			id,
			type: componentType,
			children: [],
			props: {},
			_unserializedProps: props,
			_internalFiber: internalInstanceHandle,
			namedChildren: {}
		};

		const isImperative = [
			'Form.TextField',
			'Form.PasswordField',
			'Form.TextArea',
			'Form.Checkbox',
			'Form.DatePicker',
			'Form.Dropdown',
			'Form.TagPicker',
			'Form.FilePicker'
		].includes(instance.type as string);

		if (isImperative) {
			Object.assign(instance, {
				focus: () => {
					writeOutput({
						type: 'FOCUS_ELEMENT',
						payload: { elementId: instance.id }
					});
				},
				reset: () => {
					writeOutput({
						type: 'RESET_ELEMENT',
						payload: { elementId: instance.id }
					});
				}
			});
		}

		(internalInstanceHandle as Fiber).stateNode = instance;
		instances.set(id, instance);

		addToCommitBuffer({
			type: 'CREATE_INSTANCE',
			payload: {
				id,
				type: componentType,
				props: instance.props,
				namedChildren: instance.namedChildren
			}
		});
		return instance;
	},

	createTextInstance(text) {
		const id = getNextInstanceId();
		const instance: TextInstance = { id, type: 'TEXT', text };
		instances.set(id, instance);
		addToCommitBuffer({
			type: 'CREATE_TEXT_INSTANCE',
			payload: { id: instance.id, type: instance.type, text: instance.text }
		});
		return instance;
	},

	appendInitialChild: appendChildToParent,
	appendChild: appendChildToParent,
	appendChildToContainer: appendChildToParent,
	insertBefore: insertChildBefore,
	insertInContainerBefore: insertChildBefore,
	removeChild: removeChildFromParent,
	removeChildFromContainer: removeChildFromParent,

	commitUpdate(instance, type, oldProps, newProps) {
		const propsToSerialize: Record<string, unknown> = {};
		for (const key in newProps) {
			if (key !== 'children' && key !== 'ref' && !React.isValidElement(newProps[key])) {
				propsToSerialize[key] = newProps[key];
			}
		}

		instance.props = serializeProps(propsToSerialize);
		instance._unserializedProps = newProps;

		addToCommitBuffer({
			type: 'UPDATE_PROPS',
			payload: {
				id: instance.id,
				props: instance.props,
				namedChildren: instance.namedChildren
			}
		});
	},

	commitTextUpdate(textInstance, oldText, newText) {
		textInstance.text = newText;
		addToCommitBuffer({
			type: 'UPDATE_TEXT',
			payload: { id: textInstance.id, text: newText }
		});
	},

	finalizeInitialChildren: (instance, type, props) => {
		const { propsToSerialize, namedChildren } = processProps(props);
		instance.props = serializeProps(propsToSerialize);
		instance.namedChildren = { ...instance.namedChildren, ...namedChildren };

		addToCommitBuffer({
			type: 'UPDATE_PROPS',
			payload: { id: instance.id, props: instance.props, namedChildren: instance.namedChildren }
		});

		return false;
	},
	shouldSetTextContent: () => false,

	clearContainer: (container) => {
		container.children = [];
		addToCommitBuffer({
			type: 'CLEAR_CONTAINER',
			payload: { containerId: container.id }
		});
	},

	scheduleTimeout: setTimeout,
	cancelTimeout: (id) => clearTimeout(id),
	noTimeout: -1,

	isPrimaryRenderer: true,
	supportsMutation: true,
	supportsPersistence: false,
	supportsHydration: false,

	detachDeletedInstance() {},
	commitMount() {},
	hideInstance() {},
	hideTextInstance() {},
	unhideInstance() {},
	unhideTextInstance() {},
	resetTextContent() {},
	preparePortalMount() {},
	getCurrentUpdatePriority: () => 1,
	getInstanceFromNode: () => null,
	beforeActiveInstanceBlur: () => {},
	afterActiveInstanceBlur: () => {},
	prepareScopeUpdate() {},
	getInstanceFromScope: () => null,
	setCurrentUpdatePriority() {},
	resolveUpdatePriority: () => 1,
	maySuspendCommit: () => false,
	NotPendingTransition: null,
	HostTransitionContext: React.createContext(null) as unknown as ReactContext<null>,

	resetFormInstance: function (): void {
		throw new Error('Function not implemented.');
	},
	requestPostPaintCallback: function (): void {
		throw new Error('Function not implemented.');
	},
	shouldAttemptEagerTransition: function (): boolean {
		throw new Error('Function not implemented.');
	},
	trackSchedulerEvent: function (): void {
		throw new Error('Function not implemented.');
	},
	resolveEventType: function (): null | string {
		throw new Error('Function not implemented.');
	},
	resolveEventTimeStamp: function (): number {
		throw new Error('Function not implemented.');
	},
	preloadInstance: function (): boolean {
		throw new Error('Function not implemented.');
	},
	startSuspendingCommit: function (): void {
		throw new Error('Function not implemented.');
	},
	suspendInstance: function (): void {
		throw new Error('Function not implemented.');
	},
	waitForCommitToBeReady: function () {
		throw new Error('Function not implemented.');
	}
};
