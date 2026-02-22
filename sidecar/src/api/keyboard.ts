type KeyEquivalent =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z'
	| '0'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '7'
	| '8'
	| '9'
	| '.'
	| ','
	| ';'
	| '='
	| '+'
	| '-'
	| '['
	| ']'
	| '{'
	| '}'
	| '«'
	| '»'
	| '('
	| ')'
	| '/'
	| '\\'
	| "'"
	| '`'
	| '§'
	| '^'
	| '@'
	| '$'
	| 'return'
	| 'delete'
	| 'deleteForward'
	| 'tab'
	| 'arrowUp'
	| 'arrowDown'
	| 'arrowLeft'
	| 'arrowRight'
	| 'pageUp'
	| 'pageDown'
	| 'home'
	| 'end'
	| 'space'
	| 'escape'
	| 'enter'
	| 'backspace';
type KeyModifier = 'cmd' | 'ctrl' | 'opt' | 'shift';

type KeyboardShortcut = {
	key: KeyEquivalent;
	modifiers: KeyModifier[];
};

const Common = {
	Copy: { modifiers: ['cmd', 'shift'], key: 'c' },
	CopyDeeplink: { modifiers: ['cmd', 'shift'], key: 'c' },
	CopyName: { modifiers: ['cmd', 'shift'], key: '.' },
	CopyPath: { modifiers: ['cmd', 'shift'], key: ',' },
	Duplicate: { modifiers: ['cmd'], key: 'd' },
	Edit: { modifiers: ['cmd'], key: 'e' },
	MoveDown: { modifiers: ['cmd', 'shift'], key: 'arrowDown' },
	MoveUp: { modifiers: ['cmd', 'shift'], key: 'arrowUp' },
	New: { modifiers: ['cmd'], key: 'n' },
	Open: { modifiers: ['cmd'], key: 'o' },
	OpenWith: { modifiers: ['cmd', 'shift'], key: 'o' },
	Pin: { modifiers: ['cmd', 'shift'], key: 'p' },
	Refresh: { modifiers: ['cmd'], key: 'r' },
	Remove: { modifiers: ['cmd'], key: 'x' },
	RemoveAll: { modifiers: ['cmd', 'shift'], key: 'x' },
	ToggleQuickLook: { modifiers: ['cmd'], key: 'y' }
} satisfies Record<string, KeyboardShortcut>;

export const Keyboard = {
	Shortcut: { Common }
};
