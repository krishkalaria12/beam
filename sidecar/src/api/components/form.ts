import { createWrapperComponent, createSlottedComponent } from '../utils';

const Form = createSlottedComponent('Form', ['searchBarAccessory', 'actions']);

const FormTextField = createWrapperComponent('Form.TextField');
const FormTextArea = createWrapperComponent('Form.TextArea');

const FormDropdown = createWrapperComponent('Form.Dropdown');
const FormDropdownItem = createWrapperComponent('Form.Dropdown.Item');
const FormDropdownSection = createWrapperComponent('Form.Dropdown.Section');

const FormLinkAccessory = createWrapperComponent('Form.LinkAccessory');

Object.assign(FormDropdown, {
	Item: FormDropdownItem,
	Section: FormDropdownSection
});

const FormDescription = createWrapperComponent('Form.Description');

Object.assign(Form, {
	Dropdown: FormDropdown,
	TextField: FormTextField,
	TextArea: FormTextArea,
	Description: FormDescription,
	LinkAccessory: FormLinkAccessory
});

export { Form };
