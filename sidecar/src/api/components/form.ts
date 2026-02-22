import { createWrapperComponent, createSlottedComponent } from '../utils';

const Form = createSlottedComponent('Form', ['searchBarAccessory', 'actions']);

const FormTextField = createWrapperComponent('Form.TextField');
const FormPasswordField = createWrapperComponent('Form.PasswordField');
const FormTextArea = createWrapperComponent('Form.TextArea');
const FormCheckbox = createWrapperComponent('Form.Checkbox');
const FormDatePicker = createWrapperComponent('Form.DatePicker');

const FormDropdown = createWrapperComponent('Form.Dropdown');
const FormDropdownItem = createWrapperComponent('Form.Dropdown.Item');
const FormDropdownSection = createWrapperComponent('Form.Dropdown.Section');
const FormTagPicker = createWrapperComponent('Form.TagPicker');
const FormTagPickerItem = createWrapperComponent('Form.TagPicker.Item');
const FormTagPickerSection = createWrapperComponent('Form.TagPicker.Section');
const FormFilePicker = createWrapperComponent('Form.FilePicker');

const FormLinkAccessory = createWrapperComponent('Form.LinkAccessory');

Object.assign(FormDropdown, {
	Item: FormDropdownItem,
	Section: FormDropdownSection
});

Object.assign(FormTagPicker, {
	Item: FormTagPickerItem,
	Section: FormTagPickerSection
});

const FormDescription = createWrapperComponent('Form.Description');

Object.assign(Form, {
	Dropdown: FormDropdown,
	TagPicker: FormTagPicker,
	TextField: FormTextField,
	PasswordField: FormPasswordField,
	TextArea: FormTextArea,
	Checkbox: FormCheckbox,
	DatePicker: FormDatePicker,
	FilePicker: FormFilePicker,
	Description: FormDescription,
	LinkAccessory: FormLinkAccessory
});

export { Form };
